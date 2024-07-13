// const path = require('path')
// const fs = require('fs')

$(function () {
  $('body').one('pinegrow-ready', function (e, pinegrow) {
    pinegrow.classStyles.canUseComponents = function (info) {
      // A hack to avoid the dialog that notifies can't use component styles
      info = info || { reason: '' }
      var dp = pgDmStore.getActiveDesignProvider()
      if (!dp || !(dp instanceof PgDmDesignProviderForTailwind)) {
        info.reason =
          'Component styles require activated Tailwind CSS Design panel.'
        return false
      }
      // if(dp.useExternalBuild()) {
      //     info.reason = 'Component styles do not work with the external Tailwind CSS build process. They only work with the internal compiler.'
      //     return false;
      // }
      return true
    }

    // nw.Window.get().showDevTools()
    const fxKey = 'internal-external-tw-builder'
    const fxName = 'Internal External Tailwind CSS Builder'
    var framework = new PgFramework(fxKey, fxName)
    pinegrow.addFramework(framework, 3)
    console.log(`${fxName} plugin: Loaded successfully!`)

    let activeOnProject = false,
      _projectRoot
    const isExistsAndDirectory = (filePath) =>
      !!(fs.existsSync(filePath) && fs.statSync(filePath).isDirectory())

    const isExistsAndFile = (filePath) =>
      !!(fs.existsSync(filePath) && fs.statSync(filePath).isFile())

    function parseTwData({
      projectRoot,
      dependencyRoot,
      watchMode,
      postcss,
      customPostCssPath,
      configPath,
      cssPath,
      cssOutputPath,
      cssOutputMinify,
    }) {
      // 1. Set to dependencyRoot if available
      let parserRoot = dependencyRoot

      if (!parserRoot) {
        if (!projectRoot && pinegrow.getCurrentProject()) {
          projectRoot = pinegrow.getCurrentProject().root.path
        }

        if (projectRoot) {
          const possibleParserRoot = path.resolve(
            projectRoot,
            './node_modules/@pinegrow/tailwindcss-plugin',
          )
          if (isExistsAndDirectory(possibleParserRoot)) {
            // 2. Set to user's tailwindcss-plugin where any dependencies (tailwind plugins added to the plugins array of tailwind.config.js) are resolved to the user's node_modules folder
            parserRoot = possibleParserRoot
          }
        }
      }

      if (!parserRoot) {
        // 3. Set to pinegrow's internal tailwind-parser that will use tailwind version installed with it (currently v3.1.8). This can be useful may be for the internal compiler?
        projectRoot = ''
        parserRoot =
          'frameworks/vue-svelte-designer/packages/tailwindcss-plugin'
      }

      try {
        const tailwindParser = require(parserRoot).tailwindParser

        tailwindParser
          .init({
            projectRoot,
            // dependencyRoot, // Needed? check parser, it has a reference to it
            watchMode,
            postcss,
            customPostCssPath,
            configPath,
            cssPath,
            cssOutputPath,
            cssOutputMinify,
          })
          .then((twData) => {
            if (twData) {
              console.log(twData)
              framework.twData = twData
              try {
                const usedClassesFilePath = path.resolve(
                  projectRoot,
                  '_pginfo/used-classes.html',
                )

                setTimeout(() => {
                  pinegrow.showQuickMessage(
                    `${fxName} plugin: Started build in watch mode, class list refreshed!`,
                    2500,
                    true,
                    false, // false means info, true means error
                    // 0,
                  )
                }, 4000)

                if (isExistsAndFile(usedClassesFilePath)) {
                  let markup = fs.readFileSync(usedClassesFilePath, {
                    encoding: 'utf8',
                    flag: 'r',
                  })
                  if (markup.trim()) {
                    let liveClasses = markup.match(/class="([^"]*)"/)
                    if (liveClasses) {
                      liveClasses = liveClasses[1].trim()
                    }
                    const mergedLiveClasses = [
                      ...liveClasses.split(' '),
                      ...twData.classList,
                    ]
                    liveClasses = [...new Set(mergedLiveClasses || [])]
                    markup = `<html><body><div class="${liveClasses.join(
                      ' ',
                    )}"></div></body></html>`
                    fs.writeFileSync(usedClassesFilePath, markup, {
                      encoding: 'utf8',
                      flag: 'w',
                    })
                  } else {
                    // Empty file, fs.watch double event with empty file first when write is in fact two events - empty existing file & then write
                    // This watch event is ignored
                    // return
                    // throw new Error('Empty package.json file')
                  }
                }
              } catch (err) {
                console.log(err)
              }

              twData.logs?.forEach((log) => {
                if (log.type === 'error') {
                  console.log(`${fxName} plugin: An error occurred!`)
                }
                log.logMessage && console.log(log.logMessage)
                log.errMessage && console.log(log.errMessage)
              })
            }
          })
      } catch (err) {
        console.log(`Pinegrow: @pinegrow/tailwindcss-plugin unavailable!`)
        console.log(err)
      }
    }

    const onProjectLoaded = async () => {
      if (!pinegrow.classStyles.canUseComponents()) {
        return
      }

      const projectInfo = pinegrow.getCurrentProjectInfo()
      if (!projectInfo) {
        return
      }

      const projectRoot = (_projectRoot =
        pinegrow.getCurrentProject().root.path)

      const getPossibleConfigPaths = () => {
        const configPath = ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'].reduce(
          (acc, extn) => {
            let configPath = path.resolve(
              projectRoot,
              `tailwind.config.${extn}`,
            )
            if (isExistsAndFile(configPath)) {
              return configPath || acc
            } else {
              return acc
            }
          },
          false,
        )
        return configPath
      }

      const dp = pgDmStore.getActiveDesignProvider()
      const isExternalBuild = dp.settings.mode === 'external'
      if (!isExternalBuild) {
        return
      } else {
        activeOnProject = true
      }

      let configPath = getPossibleConfigPaths()
      if (configPath) {
        let configData = fs.readFileSync(configPath, {
          encoding: 'utf8',
          flag: 'r',
        })
        if (configData.trim()) {
          if (
            !configData.includes('_pginfo') ||
            !configData.includes('relative')
          ) {
            pinegrow.showAlert(
              `<b>${fxName} plugin</b>: Your tailwind config file doesn't have the correct content array setup in order to work with Pinegrow's live designing feature during development. 
              <br><br>
              Ensure that your content array looks like the below. <b>IMPORTANT:</b>Then, re-open your project in Pinegrow.
              <br><br>
              <code>
              /* Please ensure that you update the filenames and paths to accurately match those used in your project. */<br>
                &nbsp;get content() {<br>
                &nbsp;&nbsp;&nbsp;let _content = [<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'./index.html',<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'./src/**/*.{html,vue,svelte,astro,js,cjs,mjs,ts,cts,mts,jsx,tsx,md,mdx}',<br>
                &nbsp;&nbsp;&nbsp;]<br>
                &nbsp;&nbsp;&nbsp;return {<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;relative: true,<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;files:<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;process.env.NODE_ENV === 'production'<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;? _content<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: [..._content, './_pginfo/**/*.{html,js}'], // used by Pinegrow for live-designing during development<br>
                &nbsp;&nbsp;&nbsp;}<br>
                &nbsp;}</code>`,
              'Tailwind Config Content Array Issue!',
              null,
              'Okay',
            )
            return
          }
        } else {
          // Empty file, fs.watch double event with empty file first when write is in fact two events - empty existing file & then write
          // This watch event is ignored
          // return
          // throw new Error('Empty package.json file')
        }
      }

      if (!configPath) {
        const configTemplate = `
/* Pinegrow generated Design Panel Begin */

const pg_colors = {}
const pg_fonts = {}
const pg_backgrounds = {}

/* Pinegrow generated Design Panel End */        
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  plugins: [],
  theme: {
    extend: {
      colors: pg_colors,
      fontFamily: pg_fonts,
      backgrounds: pg_backgrounds,
    },
  },

  /* Please ensure that you update the filenames and paths to accurately match those used in your project. */
  get content() {
    let _content = [
      './index.html',
      './src/**/*.{html,vue,svelte,astro,js,cjs,mjs,ts,cts,mts,jsx,tsx,md,mdx}',
    ]
    return {
      relative: true,
      files:
        process.env.NODE_ENV === 'production'
          ? _content
          : [..._content, './_pginfo/**/*.{html,js}'], // used by Vue Desginer for live-designing during development,
    }
  },
}
`
        configPath = path.resolve(projectRoot, 'tailwind.config.js')
        fs.writeFileSync(
          path.resolve(projectRoot, 'tailwind.config.js'),
          configTemplate,
          {
            encoding: 'utf8',
            flag: 'w',
          },
        )

        pinegrow.showQuickMessage(
          `${fxName} plugin: No Tailwind Config file detected, an empty config file is created at project root!`,
          2500,
          true,
          false, // false means info, true means error
          // 0,
        )
      }

      const cssPath =
        crsaMakeFileFromUrl(dp.settings.external_source_url) ||
        path.resolve(projectRoot, 'assets/css/tailwind.css')

      parseTwData({
        // projectRoot, // process.cwd()
        // dependencyRoot, // node_modules/@pinegrow/tailwindcss-plugin
        watchMode: true,
        // postcss: true, // Not sure how --post works with tailwind cli
        // customPostCssPath: path.resolve(process.cwd(), 'postcss.config.js'), // Not sure how --post works with tailwind cli
        configPath,
        cssPath,
        cssOutputPath: path.resolve(projectRoot, 'styles/main.css'),
        // cssOutputMinify: true,
      })
    }

    const onProjectClosed = () => {
      if (!activeOnProject) {
        return
      }

      try {
        const usedClassesFilePath = path.resolve(
          _projectRoot,
          '_pginfo/used-classes.html',
        )
        if (isExistsAndFile(usedClassesFilePath)) {
          const emptyMarkup = `<html><body><div class=""></div></body></html>`
          fs.writeFileSync(usedClassesFilePath, emptyMarkup, {
            encoding: 'utf8',
            flag: 'w',
          })
        }
      } catch (err) {
        console.log(err)
      }

      // To programmatically close the watcher & remove context on project close
      if (
        framework.twData?.destroy &&
        typeof framework.twData.destroy === 'function'
      ) {
        console.log(
          `${fxName} plugin: Stopped plugin activity, such as file watchers, etc.`,
        )
        pinegrow.showQuickMessage(
          `${fxName} plugin: Terminated build in watch mode, class list has been cleared!`,
          2500,
          true,
          false, // false means info, true means error
          // 0,
        )

        try {
          framework.twData
            .destroy()
            .then((finalWords) => finalWords && console.log(finalWords))
        } catch (err) {
          const finalWords = framework.twData.destroy()
          finalWords && console.log(finalWords)
        }
      }
    }

    pinegrow.addEventHandler('on_project_loaded', onProjectLoaded)
    pinegrow.addEventHandler('on_project_closed', onProjectClosed)
    onProjectLoaded()
  })
})
