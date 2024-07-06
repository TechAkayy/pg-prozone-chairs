// const path = require('path')
// const fs = require('fs')

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
  const isExistsAndDirectory = (filePath) =>
    !!(fs.existsSync(filePath) && fs.statSync(filePath).isDirectory())

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
    parserRoot = 'frameworks/vue-svelte-designer/packages/tailwindcss-plugin'
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
        console.log({ ...twData, parserRoot })
        return { ...twData, parserRoot }
      })
  } catch (err) {
    console.log(`Pinegrow: @pinegrow/tailwindcss-plugin unavailable!`)
    console.log(err)
  }
}
projectRoot = pinegrow.getCurrentProject().root.path
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
