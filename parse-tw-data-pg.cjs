$(function () {
  $('body').one('pinegrow-ready', function (e, pinegrow) {
    // nw.Window.get().showDevTools()

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

    const fxKey = 'automatictwcssbuilder'
    const fxName = 'Automatic Tailwind CSS Builder'
    var framework = new PgFramework(fxKey, fxName)
    pinegrow.addFramework(framework, 3)
    console.log(`${fxName}: Loaded successfully!`)

    let activeInProject = false,
      buildInProgress = false,
      currentProject,
      projectInfo,
      projectRoot,
      cssPath,
      configPath,
      postcssPath

    const isExistsAndDirectory = (filePath) =>
      !!(fs.existsSync(filePath) && fs.statSync(filePath).isDirectory())

    const isExistsAndFile = (filePath) =>
      !!(fs.existsSync(filePath) && fs.statSync(filePath).isFile())

    const settingKey_welcome_shown = `${fxKey}_welcome_shown`
    const settingVal_welcome_shown = pinegrow.getSetting(
      settingKey_welcome_shown,
    )

    const settingKey_build_watch_started = `${fxKey}_build_watch_started`
    let settingVal_build_watch_started

    // Menu
    let isSetupValid = false,
      autoWatchBuildOnProjectOpen = false

    const $menu = $(`
      <li id="automatic-tailwind-builder" class="aadropdown menu-${fxKey}">
          <a href="#" class="aadropdown-toggle" data-toggle="aadropdown"><span>Tailwind CSS</span></a>
      </li>
      `)

    const showWelcomeMsg = () => {
      const alertMsg = `
        Here are some helpful tips:<br><br>
        1. This plugin works only within Tailwind CSS projects (Pinegrow Pro) configured to use the "external" build via the Design Panel. <br><br>
        2. If you are running tailwind-cli or postcss-cli externally from a terminal, you no longer need to do this when using this plugin.<br><br>
        3. To activate this plugin, open your Tailwind CSS project, ensure the Design Panel is active and configured for the "external" build. Then, use the menu <b>Tailwind CSS / Run Setup</b> and follow the instructions.
        <br><br><br>
        <b>IMPORTANT:</b> The external build lets you use Tailwind CSS plugins such as DaisyUI, Flowbite, etc., (non-cdn, unused classes are treeshaken) and enables advanced customizations of your Tailwind CSS configuration.
        <br><br> 
        If you don't require these advanced capabilities, it's best to use the internal compiler that comes with Pinegrow's Tailwind CSS Addon. Therefore, once you start using the external build, switching back to the internal compiler is not recommended unless you do not use these advanced capabilities.
        <br><br>
        <b>Disclaimer</b>: This plugin is free and open-source. It is provided "as-is" without any warranties or guarantees. Use it at your own risk. Also, note that Pinegrow plugins such as this one are only for the desktop app and are not applicable for the Pinegrow WP plugin or Pinegrow Online.`

      pinegrow.setSetting(settingKey_welcome_shown, true)
      pinegrow.showAlert(alertMsg, `Welcome to ${fxName} plugin`, null, 'Okay')
    }

    if (!settingVal_welcome_shown) {
      // Welcome message shown when plugin is loaded first time
      showWelcomeMsg()
    }

    showNotExternalBuildMsg = () => {
      pinegrow.showAlert(
        `Unable to run setup, use Design Panel to change to <b>external</b> build mode!
        <br><br>
        To learn about this plugin, use the menu <b>Tailwind CSS / How to...</b>.`,
        `<b>${fxName}</b>: External Build only!`,
        null,
        'Okay',
      )
    }

    const reRunMsg = `re-run setup via menu <b>Tailwind CSS / Run Setup</b> and follow the instructions.`

    const onProjectLoaded = () => {
      $menu.remove()

      projectInfo = pinegrow.getCurrentProjectInfo()
      if (!projectInfo) {
        // Project not opened
        return
      }
      currentProject = pinegrow.getCurrentProject()
      projectRoot = currentProject.root.path
      var dp = pgDmStore.getActiveDesignProvider()

      // if (!dp || !(dp instanceof PgDmDesignProviderForTailwind)) {
      //   // Not a tailwind project
      //   return
      // }

      activeInProject = projectInfo.getSetting(fxKey)

      // Menu
      pinegrow.addPluginControlToTopbar(framework, $menu, true)
      var menuView = new PgDropdownMenu($(`.menu-${fxKey}`))

      menuView.onGetActions = function (menu) {
        menu.add({
          type: 'header',
          label: fxName,
        })
        menu.add({
          label: `How to...`,
          action: function () {
            showWelcomeMsg()
          },
        })
        menu.add({
          type: 'divider',
        })

        if (!isSetupValid) {
          menu.add({
            label: `Run Setup`,
            helptext:
              'Run validations to prepare your Tailwind CSS project for automatic external build.',
            action: function () {
              if (!dp) {
                showNotExternalBuildMsg()
              }
              const isExternalBuild = dp.settings.mode === 'external'

              if (isExternalBuild) {
                runSetup().then(() => {
                  if (isSetupValid) {
                    pinegrow.showAlert(
                      `Congrats! Setup is now complete. <br><br> 
                      You can use the <b>Tailwind CSS</b> menu to either start the builder manually or enable auto-start for this project when it is opened.`,
                      `<b>${fxName}</b>: Setup Complete`,
                      null,
                      'Okay',
                    )
                  }
                })
              } else {
                showNotExternalBuildMsg()
              }
            },
          })
        } else {
          menu.add({
            type: 'header',
            label: `Setup Complete`,
          })
          if (buildInProgress) {
            menu.add({
              label: `Stop Build`,
              helptext: 'Actively building your Tailwind CSS setup.',
              action: function () {
                pinegrow.showAlert(
                  `To stop the active builder, save and re-open your project.`,
                  `<b>${fxName}</b>: Stop Build!`,
                  null,
                  'Okay',
                )
              },
            })
          } else {
            menu.add({
              label: `Start Build`,
              helptext: 'Start Tailwind CSS Builder in Watch mode.',
              action: function () {
                startBuild()
              },
            })
          }

          menu.add({
            label: `Auto Start Build`,
            helptext:
              'Automatically Start the Builder in Watch mode when a Tailwind CSS project using external build mode is opened.',
            check: function () {
              return !!autoWatchBuildOnProjectOpen
            },
            action: function () {
              autoWatchBuildOnProjectOpen = !autoWatchBuildOnProjectOpen
              const alertMsg = autoWatchBuildOnProjectOpen
                ? `You have <b>turned on</b> Auto-Start. Next time a Tailwind CSS project that's activated with this plugin is opened in Pinegrow, the Builder will automatically start in Watch mode.`
                : `You have <b>turned off</b> Auto-Start. Use the <b>Start Build</b> menu to manually start the Builder in Watch mode after opening your project.`
              pinegrow.showAlert(
                `${alertMsg} 
                <br><br>
                <b>IMPORTANT:</b> Save and re-open your project to activate this setting.`,
                `<b>${fxName}</b>: Auto Start Tailwind CSS Builder!`,
                null,
                'Okay',
              )
            },
          })
          menu.add({
            type: 'divider',
          })
          menu.add({
            label: `Deactivate from project`,
            helptext: `Reset plugin activation for this project.`,
            action: function () {
              projectInfo.setSetting(fxKey, false)
              projectInfo.save()
              pinegrow.showAlert(
                `Plugin is deactivated for this project. To reactivate, ${reRunMsg}
                <br><br>
                <b>IMPORTANT:</b> Save and re-open your project to activate this setting.`,
                `<b>${fxName}</b>: Deactivated!`,
                null,
                'Okay',
              )
            },
          })

          menu.add({
            label: `Reset alert preference`,
            helptext:
              'Show confirmation alert when Builder has started in Watch mode! Quick alert will be displayed otherwise.',
            action: function () {
              pinegrow.setSetting(settingKey_build_watch_started, null)
            },
          })
        }
      }

      if (activeInProject) {
        runSetup().then(() => {
          if (isSetupValid && autoWatchBuildOnProjectOpen) {
            const isExternalBuild = dp.settings.mode === 'external'

            if (!isExternalBuild) {
              setTimeout(() => {
                showNotExternalBuildMsg()
              }, 4000)
            } else {
              startBuild()
            }
          }
        })
      }
    }
    onProjectLoaded()

    function runSetup() {
      return new Promise((resolve, reject) => {
        validateProject()
          .then((validData) => {
            if (!validData || !validData.configPath || !validData.cssPath) {
              return
            } else {
              projectInfo.setSetting(fxKey, true)
              projectInfo.save()
              activeInProject = true
              isSetupValid = true
              resolve()
            }
          })
          .catch((err) => {
            // console.log(err)
            isSetupValid = false
          })
      })
    }

    function startBuild() {
      parseTwData({
        // projectRoot, // process.cwd()
        // dependencyRoot, // node_modules/@pinegrow/tailwindcss-plugin
        watchMode: true,
        // postcss: true, // Not sure how --post works with tailwind cli
        // customPostCssPath: path.resolve(process.cwd(), 'postcss.config.js'), // Not sure how --post works with tailwind cli
        configPath,
        cssPath,
        cssOutputPath: path.resolve(projectRoot, 'tailwind_theme/tailwind.css'),
        // cssOutputMinify: true,
      })
    }

    function validateProject() {
      return new Promise((resolve, reject) => {
        validateCssPath()
          .then((_cssPath) => {
            validatePackageJson()
              .then(() => {
                validateNodeModulesPath()
                  .then(() => {
                    validateConfigPath()
                      .then((_configPath) => {
                        validatePostcssPath()
                          .then((_postcssPath) => {
                            cssPath = _cssPath
                            configPath = _configPath
                            postcssPath = _postcssPath
                            resolve({ configPath, cssPath, postcssPath })
                          })
                          .catch((err) => {
                            console.log(err)
                            reject()
                          })
                      })
                      .catch((err) => {
                        console.log(err)
                        reject()
                      })
                  })
                  .catch((err) => {
                    console.log(err)
                    reject()
                  })
              })
              .catch((err) => {
                console.log(err)
                reject()
              })
          })
          .catch((err) => {
            console.log(err)
            reject()
          })
      })
    }

    function validateCssPath() {
      return new Promise((resolve, reject) => {
        let cssPath

        var dp = pgDmStore.getActiveDesignProvider()
        const dpSettingsExternalSourceUrl = dp.settings.external_source_url

        if (dpSettingsExternalSourceUrl) {
          if (crsaIsFileUrl(dpSettingsExternalSourceUrl)) {
            cssPath = crsaMakeFileFromUrl(dpSettingsExternalSourceUrl)
          } else {
            // relative path
            cssPath = path.resolve(projectRoot, dpSettingsExternalSourceUrl)
          }

          cssPath = isExistsAndFile(cssPath) ? cssPath : false

          if (cssPath) {
            let cssData = fs.readFileSync(cssPath, {
              encoding: 'utf8',
              flag: 'r',
            })
            if (cssData.trim()) {
              if (
                cssData.includes('@tailwind') &&
                cssData.includes('base') &&
                cssData.includes('components') &&
                cssData.includes('utilities')
              ) {
                resolve(cssPath)
              } else {
                pinegrow.showAlert(
                  `Your CSS file ${dpSettingsExternalSourceUrl} doesn't include the required Tailwind CSS directives.
                  <br><br>
                  Ensure that the following directives are added like below. <b>IMPORTANT:</b> After updating it, ${reRunMsg}
                  <br><br>
                  <code>
                  &nbsp;@tailwind base;<br>
                  @tailwind components;<br>
                  @tailwind utilities;<br>
                  </code>`,
                  `<b>${fxName}</b>: Tailwind CSS File Issue!`,
                  null,
                  'Okay',
                  null,
                  // 1. cssPath must contain all tailwind directives
                  () => reject(`${fxName}: CSS Path validation failed!`),
                )
              }
            } else {
              // Empty file, fs.watch double event with empty file first when write is in fact two events - empty existing file & then write
              // This watch event is ignored
              // return
              // throw new Error('Empty package.json file')
            }
          } else {
            pinegrow.showAlert(
              `CSS Source file configured in the Design Panel <code>${dpSettingsExternalSourceUrl}</code> doesn't exist. Create a new file and configure the same (or) choose an existing CSS Source file via the Design Panel!
              <br><br>
              <b>IMPORTANT:</b> After fixing the path, ${reRunMsg}`,
              `<b>${fxName}</b>: CSS Path doesn't exist`,
              null,
              'Okay',
              null,
              // 2. cssPath must exist
              () => reject(`${fxName}: CSS Path validation failed!`),
            )
          }
        } else {
          const cssPathTemplate = `
            @tailwind base;
            @tailwind components;
            @tailwind utilities;
            `
          cssPath = path.resolve(projectRoot, 'tailwind.css')
          fs.writeFileSync(cssPath, cssPathTemplate, {
            encoding: 'utf8',
            flag: 'w',
          })

          setTimeout(function () {
            // Delay refresh just to make sure any other file changes are included.
            pinegrow.refreshCurrentProject(
              null,
              false,
              true /* no restore tags */,
            )
          }, 1000)

          const cssPathRelative = path.relative(projectRoot, cssPath)

          dp.setSettings({
            ...dp.settings,
            external_source_url: cssPathRelative,
          })
          pgDmStore.update()
          pinegrow.showAlert(
            `A minimal CSS Source file containing Tailwind CSS directives was automatically created at your project root as no file was configured in your Design Panel.
            <br><br>
            The same file was also automatically configured as the Source File in your Design Panel. Please verify!`,
            `<b>${fxName}</b>: Minimal CSS file auto-generated!`,
            null,
            'Okay',
            null,
            // 3. cssPath must exist, otherwise auto created
            () => resolve(cssPath),
          )
        }
      })
    }

    function validatePackageJson() {
      return new Promise((resolve, reject) => {
        let packageJsonPath = path.resolve(projectRoot, 'package.json')

        packageJsonPath = isExistsAndFile(packageJsonPath)
          ? packageJsonPath
          : false

        if (packageJsonPath) {
          let packageJsonData = fs.readFileSync(packageJsonPath, {
            encoding: 'utf8',
            flag: 'r',
          })
          if (packageJsonData.trim()) {
            try {
              packageJsonData = JSON.parse(packageJsonData) || {}
            } catch (err) {
              console.log(err)

              copyCodeToClipboard(installCmd.replaceAll('<br>', '\n'))
              pinegrow.showAlert(
                `Invalid <code>package.json</code> detected, ensure it's a valid JSON file! 
                <br><br>
                <b>IMPORTANT:</b> After updating, ${reRunMsg}
                <br><br>
                <code>${installCmd}</code>`,
                `<b>${fxName}</b>: Invalid package.json!`,
                null,
                'Okay',
                null,
                () =>
                  // 4. package.json must be valid
                  reject(`${fxName}: package.json validation failed!`),
              )
            }

            let installCmd

            const tailwindcssNodeModulesPath = path.resolve(
              projectRoot,
              'node_modules',
              'tailwindcss',
            )
            const tailwindcssExistsInNodeModules = isExistsAndDirectory(
              tailwindcssNodeModulesPath,
            )

            const tailwindcssExistsInPackageJson = !!(
              packageJsonData.dependencies?.['tailwindcss'] ||
              packageJsonData.devDependencies?.['tailwindcss']
            )

            if (
              !tailwindcssExistsInNodeModules &&
              !tailwindcssExistsInPackageJson
            ) {
              installCmd = `cd "${projectRoot}"<br>
                  npm install -D tailwindcss@3`
            }

            if (
              !(
                packageJsonData.dependencies &&
                packageJsonData.dependencies['@pinegrow/tailwindcss-plugin']
              ) &&
              !(
                packageJsonData.devDependencies &&
                packageJsonData.devDependencies['@pinegrow/tailwindcss-plugin']
              )
            ) {
              installCmd = `${
                installCmd ? '<br>' : `cd "${projectRoot}"<br>`
              }npm install -D @pinegrow/tailwindcss-plugin@latest`
            }

            if (!installCmd) {
              resolve()
            } else {
              copyCodeToClipboard(installCmd.replaceAll('<br>', '\n'))
              pinegrow.showAlert(
                `From your terminal/command prompt, install the required npm packages using the below set of commands.
                <br><br>
                <b>IMPORTANT:</b> After installation, ${reRunMsg}
                <br><br>
                <code>${installCmd}</code>`,
                `<b>${fxName}</b>: Install Packages!`,
                null,
                'Okay',
                null,
                () =>
                  // 5. package.json must contain the required packages
                  reject(`${fxName}: package.json validation failed!`),
              )
            }
          } else {
            // Empty file, fs.watch double event with empty file first when write is in fact two events - empty existing file & then write
            // This watch event is ignored
            // return
            // throw new Error('Empty package.json file')
          }
        } else {
          const packageJsonTemplate = `
            {
              "name": "${
                pgMakeSlug(
                  currentProject.name,
                  false /*allow_dot*/,
                  '-' /*space_replace*/,
                ) || 'my-awesome-site'
              }",
              "version": "0.0.0",
              "scripts": {
                "build": "npx tailwindcss -i tailwind.css -o tailwind_theme/tailwind.css --config tailwind.config.js --postcss --minify",
                "lighthouse": "npx unlighthouse --no-cache --site https://my-awesome-site.netlify.app",
                "lint": "npm run format",
                "format": "prettier --write . !public --ignore-path .gitignore !tailwind_theme/tailwind.css"
              },
              "devDependencies": {
                "@pinegrow/tailwindcss-plugin": "latest",
                "autoprefixer": "^10.4.14",
                "npm-run-all": "^4.1.5",
                "postcss": "^8.4.22",
                "prettier": "^2.8.4",
                "tailwindcss": "^3.3.1"
              }
            }`
          packageJsonPath = path.resolve(projectRoot, 'package.json')
          fs.writeFileSync(packageJsonPath, packageJsonTemplate, {
            encoding: 'utf8',
            flag: 'w',
          })
          setTimeout(function () {
            // Delay refresh just to make sure any other file changes are included.
            pinegrow.refreshCurrentProject(
              null,
              false,
              true /* no restore tags */,
            )
          }, 1000)

          let installCmd = `cd "${projectRoot}"<br>
            npm install`

          copyCodeToClipboard(installCmd.replaceAll('<br>', '\n'))
          pinegrow.showAlert(
            `A minimal <code>package.json</code> file was automatically created at your project root as it was not found. Please verify! 
            <br><br>
            From your terminal/command prompt, install the required npm packages using the below set of commands. <b>IMPORTANT:</b> After installation, ${reRunMsg}
            <br><br>
            <code>${installCmd}</code>`,
            `<b>${fxName}</b>: Install Packages!`,
            null,
            'Okay',
            null,
            // 6. package.json must exist
            () => reject(`${fxName}: package.json validation failed!`),
          )
        }
      })
    }

    function validateNodeModulesPath() {
      return new Promise((resolve, reject) => {
        let nodeModulesPath = path.resolve(projectRoot, 'node_modules')

        nodeModulesPath = isExistsAndDirectory(nodeModulesPath)
          ? nodeModulesPath
          : false

        if (nodeModulesPath) {
          resolve()
        } else {
          let installCmd = `cd "${projectRoot}"<br>
          npm install`

          copyCodeToClipboard(installCmd.replaceAll('<br>', '\n'))
          pinegrow.showAlert(
            `No <code>node_modules</code> folder detected at project root! 
            <br><br>
            From your terminal/command prompt, install the npm packages using the below set of commands. <b>IMPORTANT:</b> After installation, ${reRunMsg}
            <br><br>
            <code>${installCmd}</code>`,
            `<b>${fxName}</b>: Install Packages!`,
            null,
            'Okay',
            null,
            // 7. node_modules folder must exist
            () => reject(`${fxName}: node_modules validation failed!`),
          )
        }
      })
    }

    function validateConfigPath() {
      return new Promise((resolve, reject) => {
        const getPossibleConfigPaths = () => {
          const configPath = ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'].reduce(
            (acc, extn) => {
              let _configPath = path.resolve(
                projectRoot,
                `tailwind.config.${extn}`,
              )
              if (isExistsAndFile(_configPath)) {
                return _configPath || acc
              } else {
                return acc
              }
            },
            false,
          )
          return configPath
        }

        let configPath = getPossibleConfigPaths()

        if (configPath) {
          let configData = fs.readFileSync(configPath, {
            encoding: 'utf8',
            flag: 'r',
          })
          if (configData.trim()) {
            if (
              configData.includes('_pginfo') &&
              configData.includes('relative')
            ) {
              resolve(configPath)
            } else {
              pinegrow.showAlert(
                `Your Tailwind CSS config file doesn't have the correct content array setup in order to work with Pinegrow's live designing feature during development. 
                <br><br>
                Ensure that your content array looks like below. <b>IMPORTANT:</b> After updating it, ${reRunMsg}
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
                `<b>${fxName}</b>: Tailwind Config Content Array Issue!`,
                null,
                'Okay',
                null,
                () =>
                  // 8. tailwind config file must have the correct content array
                  reject(`${fxName}: Config File validation failed!`),
              )
            }
          } else {
            // Empty file, fs.watch double event with empty file first when write is in fact two events - empty existing file & then write
            // This watch event is ignored
            // return
            // throw new Error('Empty package.json file')
          }
        } else {
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
                '!./node_modules',
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
          fs.writeFileSync(configPath, configTemplate, {
            encoding: 'utf8',
            flag: 'w',
          })
          setTimeout(function () {
            // Delay refresh just to make sure any other file changes are included.
            pinegrow.refreshCurrentProject(
              null,
              false,
              true /* no restore tags */,
            )
          }, 1000)

          pinegrow.showAlert(
            `A minimal Tailwind CSS config file was automatically created at your project root as it was not found. Please verify!`,
            `<b>${fxName}</b>: Minimal Tailwind CSS config file auto-generated!`,
            null,
            'Okay',
            null,
            // 9. tailwind config file must exist, otherwise auto created
            () => resolve(configPath),
          )
        }
      })
    }

    function validatePostcssPath() {
      return new Promise((resolve, reject) => {
        const getPossiblePostcssPaths = () => {
          const postcssPath = ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'].reduce(
            (acc, extn) => {
              let _postcssPath = path.resolve(
                projectRoot,
                `postcss.config.${extn}`,
              )
              if (isExistsAndFile(_postcssPath)) {
                return _postcssPath || acc
              } else {
                return acc
              }
            },
            false,
          )
          return postcssPath
        }

        let postcssPath = getPossiblePostcssPaths()

        if (postcssPath) {
          let configData = fs.readFileSync(postcssPath, {
            encoding: 'utf8',
            flag: 'r',
          })
          if (configData.trim()) {
            if (
              configData.includes('tailwindcss') &&
              configData.includes('autoprefixer')
            ) {
              resolve(postcssPath)
            } else {
              pinegrow.showAlert(
                `Your Post CSS config file doesn't have the required plugins for Tailwind CSS.
                <br><br>
                Ensure that <b>tailwindcss</b> and <b>autoprefixer</b> plugins are added like below. <b>IMPORTANT:</b> After updating it, ${reRunMsg}
                <br><br>
                <code>
                &nbsp;module.exports = {<br>
                  &nbsp;&nbsp;&nbsp;plugins: {<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tailwindcss: {},<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;autoprefixer: {},<br>
                  &nbsp;&nbsp;&nbsp;},<br>
                }
                </code>`,
                `<b>${fxName}</b>: Post CSS Config Issue!`,
                null,
                'Okay',
                null,
                () =>
                  // 10. postcss config file must have the required plugins
                  reject(`${fxName}: Post CSS File validation failed!`),
              )
              return
            }
          } else {
            // Empty file, fs.watch double event with empty file first when write is in fact two events - empty existing file & then write
            // This watch event is ignored
            // return
            // throw new Error('Empty package.json file')
          }
        } else {
          const postcssTemplate = `
          module.exports = {
            plugins: {
              tailwindcss: {},
              autoprefixer: {},
            },
          }
          `
          postcssPath = path.resolve(projectRoot, 'postcss.config.js')
          fs.writeFileSync(postcssPath, postcssTemplate, {
            encoding: 'utf8',
            flag: 'w',
          })
          setTimeout(function () {
            // Delay refresh just to make sure any other file changes are included.
            pinegrow.refreshCurrentProject(
              null,
              false,
              true /* no restore tags */,
            )
          }, 1000)

          pinegrow.showAlert(
            `A minimal Post CSS config file was automatically created at your project root as it was not found. Please verify!`,
            `<b>${fxName}</b>: Minimal Postcss Config file auto-generated!`,
            null,
            'Okay',
            null,
            // 11. postcss config file must exist, otherwise auto created
            () => resolve(postcssPath),
          )
        }
      })
    }

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
              framework.twData = twData
              try {
                const usedClassesFilePath = path.resolve(
                  projectRoot,
                  '_pginfo/used-classes.html',
                )

                pinegrow.refreshAllPages()
                const alertMsg = `Build started in watch mode, class list refreshed! To stop the build, just close the project and re-open it.
                <br><br>
                Re-open your pages if this is the first time you are using this plugin in this project (if you notice page styles not getting applied correctly).`

                settingVal_build_watch_started = pinegrow.getSetting(
                  settingKey_build_watch_started,
                )
                if (!settingVal_build_watch_started) {
                  pinegrow.showAlert(
                    alertMsg,
                    `<b>${fxName}</b>: Build Started In Watch Mode`,
                    'Show quick alerts only',
                    'Close',
                    () => {
                      pinegrow.setSetting(
                        settingKey_build_watch_started,
                        'quick',
                      )
                      settingVal_build_watch_started = 'quick'
                    },
                    null,
                  )
                } else if (settingVal_build_watch_started === 'quick') {
                  setTimeout(() => {
                    pinegrow.showQuickMessage(
                      `<b>${fxName}</b>: Build started in watch mode, class list refreshed!`,
                      2500,
                      true,
                      false, // false means info, true means error
                      0,
                    )
                  }, 4000)
                }

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
                buildInProgress = true
              } catch (err) {
                console.log(err)
              }

              twData.logs?.forEach((log) => {
                if (log.type === 'error') {
                  console.log(`${fxName}: An error occurred!`)
                }
                log.logMessage && console.log(log.logMessage)
                log.errMessage && console.log(log.errMessage)
              })
            }
          })
      } catch (err) {
        pinegrow.showAlert(
          `Oops! We have encountered an error while building your Tailwind CSS setup.
          <br><br>
          Please open the devtools with shortcut key Cmd/Ctrl+Shift+C and look for error logs in the console and raise an issue in the plugin's Github repo.`,
          `<b>${fxName}</b>: An error has occurred!`,
          null,
          'Okay',
        )
        console.log(`Pinegrow: @pinegrow/tailwindcss-plugin unavailable!`)
        console.log(err)
      }
    }

    pinegrow.addEventHandler('on_project_loaded', onProjectLoaded)
    const onProjectClosed = () => {
      $menu.remove()
      if (!activeInProject) {
        return
      }

      try {
        const usedClassesFilePath = path.resolve(
          projectRoot,
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
          `<b>${fxName}</b>: Stopped plugin activity, such as file watchers, etc.`,
        )
        pinegrow.showQuickMessage(
          `<b>${fxName}</b>: Terminated build in watch mode, class list has been cleared!`,
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
          // console.log(err)
          const finalWords = framework.twData.destroy()
          finalWords && console.log(finalWords)
        }
      }

      activeInProject = false
      currentProject = null
      projectInfo = null
      projectRoot = null
      isSetupValid = false
      cssPath = null
      configPath = null
      postcssPath = null
      buildInProgress = false
    }

    pinegrow.addEventHandler('on_project_closed', onProjectClosed)
  })
})
