const path = require('path')
const fs = require('fs')

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
    if (!projectRoot) {
      projectRoot = process.cwd()
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
    const { tailwindParser } = require(path.resolve(parserRoot))

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
        console.log(twData.errors)
        return { ...twData, parserRoot }
      })
  } catch (err) {
    console.log(`Pinegrow: @pinegrow/tailwindcss-plugin unavailable!`)
    console.log(err)
  }
}

parseTwData({
  // projectRoot, // process.cwd()
  // dependencyRoot, // node_modules/@pinegrow/tailwindcss-plugin
  watchMode: true,
  // postcss: true, // Not sure how --post works with tailwind cli
  // customPostCssPath: path.resolve(process.cwd(), 'postcss.config.js'), // Not sure how --post works with tailwind cli
  configPath: path.resolve(process.cwd(), 'tailwind.config.js'),
  cssPath: path.resolve(process.cwd(), 'assets/css/tailwind.css'),
  cssOutputPath: path.resolve(process.cwd(), 'styles/main.css'),
  // cssOutputMinify: true,
})
