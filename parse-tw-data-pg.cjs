// const path = require('path')
// const fs = require('fs')

$(function () {
  $('body').one('pinegrow-ready', function (e, pinegrow) {
    nw.Window.get().showDevTools()
    var framework = new PgFramework(
      'internal-external-tw-builder',
      'Internal External Tw Builder',
    )
    pinegrow.addFramework(framework, 3)
    console.log(
      `Internal External Tailwind CSS Build plugin loaded successfully!`,
    )

    let twData, _projectRoot
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
              // console.log(twData)

              try {
                const usedClassesFilePath = path.resolve(
                  projectRoot,
                  '_pginfo/used-classes.html',
                )
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
                  console.log(
                    `Internal External Build plugin: An error occurred!`,
                  )
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
      const projectInfo = pinegrow.getCurrentProjectInfo()
      if (!projectInfo) {
        return
      }

      const projectRoot = (_projectRoot =
        pinegrow.getCurrentProject().root.path)
      parseTwData({
        // projectRoot, // process.cwd()
        // dependencyRoot, // node_modules/@pinegrow/tailwindcss-plugin
        watchMode: true,
        // postcss: true, // Not sure how --post works with tailwind cli
        // customPostCssPath: path.resolve(process.cwd(), 'postcss.config.js'), // Not sure how --post works with tailwind cli
        configPath: path.resolve(projectRoot, 'tailwind.config.js'),
        cssPath: path.resolve(projectRoot, 'assets/css/tailwind.css'),
        cssOutputPath: path.resolve(projectRoot, 'styles/main.css'),
        // cssOutputMinify: true,
      })
    }

    const onProjectClosed = () => {
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
      if (twData?.destroy && typeof twData.destroy === 'function') {
        twData.destroy().then((finalWords) => {
          console.log(
            `${pluginName}: Stopped plugin activity, such as file watchers, etc.`,
          )
          finalWords && console.log(finalWords)
        })
      }
    }

    pinegrow.addEventHandler('on_project_loaded', onProjectLoaded)
    pinegrow.addEventHandler('on_project_closed', onProjectClosed)
    onProjectLoaded()
  })
})
