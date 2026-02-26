const fs = require('fs-extra')
const { join, relative, resolve, dirname } = require('path')
const { pathToFileURL } = require('url')

const { log, warn, fatal } = require('../helpers/logger')
const appPaths = require('../app-paths')
const extensionJson = require('./extension-json')
const getPackagePath = require('../helpers/get-package-path')

const scriptsExtensionList = [ '', '.js', '.mjs', '.cjs' ]
const scriptsTargetFolderList = [ 'dist', 'src' ]

function getPackageScriptPath (packageFullName, scriptName, dir = appPaths.appDir) {
  for (const ext of scriptsExtensionList) {
    for (const folder of scriptsTargetFolderList) {
      const path = getPackagePath(
        join(packageFullName, folder, `${ scriptName }${ ext }`),
        dir
      )

      if (path !== void 0) return path
    }
  }
}

async function promptOverwrite ({ targetPath, options }) {
  const inquirer = require('inquirer')

  const choices = [
    { name: 'Overwrite', value: 'overwrite' },
    { name: 'Overwrite all', value: 'overwriteAll' },
    { name: 'Skip (might break extension)', value: 'skip' },
    { name: 'Skip all (might break extension)', value: 'skipAll' }
  ]

  return await inquirer.prompt([ {
    name: 'action',
    type: 'list',
    message: `Overwrite "${ relative(appPaths.appDir, targetPath) }"?`,
    choices: options !== void 0
      ? choices.filter(choice => options.includes(choice.value))
      : choices,
    default: 'overwrite'
  } ])
}

async function renderFile ({ sourcePath, targetPath, rawCopy, scope, overwritePrompt }) {
  const { isBinaryFileSync: isBinary } = require('isbinaryfile')
  const compileTemplate = require('lodash/template')

  if (overwritePrompt === true && fs.existsSync(targetPath)) {
    const answer = await promptOverwrite({
      targetPath,
      options: [ 'overwrite', 'skip' ]
    })

    if (answer.action === 'skip') {
      return
    }
  }

  fs.ensureFileSync(targetPath)

  if (rawCopy || isBinary(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath)
  }
  else {
    const rawContent = fs.readFileSync(sourcePath, 'utf-8')
    const template = compileTemplate(rawContent, { interpolate: /<%=([\s\S]+?)%>/g })
    fs.writeFileSync(targetPath, template(scope), 'utf-8')
  }
}

async function renderFolders ({ source, rawCopy, scope }) {
  const fglob = require('fast-glob')

  let overwrite
  const files = fglob.sync([ '**/*' ], { cwd: source })

  for (const rawPath of files) {
    const targetRelativePath = rawPath.split('/').map(name => {
      // dotfiles are ignored when published to npm, therefore in templates
      // we need to use underscore instead (e.g. "_gitignore")
      if (name.charAt(0) === '_' && name.charAt(1) !== '_') {
        return `.${ name.slice(1) }`
      }
      if (name.charAt(0) === '_' && name.charAt(1) === '_') {
        return `${ name.slice(1) }`
      }
      return name
    }).join('/')

    const targetPath = appPaths.resolve.app(targetRelativePath)
    const sourcePath = resolve(source, rawPath)

    if (overwrite !== 'overwriteAll' && fs.existsSync(targetPath)) {
      if (overwrite === 'skipAll') {
        continue
      }
      else {
        const answer = await promptOverwrite({ targetPath })

        if (answer.action === 'overwriteAll') {
          overwrite = 'overwriteAll'
        }
        else if (answer.action === 'skipAll') {
          overwrite = 'skipAll'
          continue
        }
        else if (answer.action === 'skip') {
          continue
        }
      }
    }

    await renderFile({ sourcePath, targetPath, rawCopy, scope })
  }
}

module.exports = class Extension {
  extId
  packageFullName
  packageName

  #isInstalled = null
  #packagePath = null

  constructor (name) {
    if (name.charAt(0) === '@') {
      const slashIndex = name.indexOf('/')
      if (slashIndex === -1) {
        fatal(`Invalid Quasar App Extension name: "${ name }"`)
      }

      this.packageFullName = name.substring(0, slashIndex + 1)
        + 'quasar-app-extension-'
        + name.substring(slashIndex + 1)

      this.packageName = '@' + this.#stripVersion(this.packageFullName.substring(1))
      this.extId = '@' + this.#stripVersion(name.substring(1))
    }
    else {
      this.packageFullName = 'quasar-app-extension-' + name
      this.packageName = this.#stripVersion('quasar-app-extension-' + name)
      this.extId = this.#stripVersion(name)
    }
  }

  get isInstalled () {
    if (this.#isInstalled === null) {
      this.#loadPackageInfo()
    }

    return this.#isInstalled
  }

  #loadPackageInfo () {
    try {
      const packagePath = (
        getPackagePath(
          join(this.packageFullName, 'package.json')
        )
        || getPackagePath(this.packageFullName)
        || getPackageScriptPath(this.packageFullName, 'index')
      )

      if (packagePath !== void 0) {
        this.#isInstalled = true
        this.#packagePath = dirname(packagePath)
        return
      }
    }
    catch (_) {}

    this.#markAsNotInstalled()
  }

  #markAsNotInstalled () {
    this.#isInstalled = false
    this.#packagePath = false
  }

  async install (skipPkgInstall) {
    if (/quasar-app-extension-/.test(this.extId)) {
      this.extId = this.extId.replace('quasar-app-extension-', '')
      log(
        `When using an extension, "quasar-app-extension-" is added automatically. Just run "quasar ext add ${
          this.extId
        }"`
      )
    }

    log(`${ skipPkgInstall ? 'Invoking' : 'Installing' } "${ this.extId }" Quasar App Extension`)
    log()

    if (skipPkgInstall !== true) {
      this.#installPackage()
    }
    else if (!this.isInstalled) {
      fatal(`Tried to invoke App Extension "${ this.extId }" but its npm package is not installed`)
    }

    const prompts = await this.#getScriptPrompts()

    extensionJson.set(this.extId, prompts)

    // run extension install
    const hooks = await this.#runInstallScript(prompts)

    log(`Quasar App Extension "${ this.extId }" successfully installed.`)
    log()

    if (hooks && hooks.exitLog.length > 0) {
      hooks.exitLog.forEach(msg => {
        console.log(msg)
      })
      console.log()
    }
  }

  async uninstall (skipPkgUninstall) {
    log(`${ skipPkgUninstall ? 'Uninvoking' : 'Uninstalling' } "${ this.extId }" Quasar App Extension`)
    log()

    // verify if already installed
    if (skipPkgUninstall === true) {
      if (!this.isInstalled) {
        fatal(`Tried to uninvoke App Extension "${ this.extId }" but there's no npm package installed for it.`)
      }
    }
    else if (!this.isInstalled) {
      warn(`Quasar App Extension "${ this.packageName }" is not installed...`)
      return
    }

    const prompts = extensionJson.getPrompts(this.extId)
    const hooks = await this.#runUninstallScript(prompts)

    extensionJson.remove(this.extId)

    skipPkgUninstall !== true && this.#uninstallPackage()

    log(`Quasar App Extension "${ this.extId }" successfully removed.`)
    log()

    if (hooks && hooks.exitLog.length > 0) {
      hooks.exitLog.forEach(msg => {
        console.log(msg)
      })
      console.log()
    }
  }

  async run (ctx) {
    if (!this.isInstalled) {
      warn(`Quasar App Extension "${ this.extId }" is missing...`)
      process.exit(1, 'ext-missing')
    }

    const script = await this.#getScript('index', true)
    const IndexAPI = require('./IndexAPI')

    const api = new IndexAPI({
      extId: this.extId,
      prompts: extensionJson.getPrompts(this.extId),
      ctx
    })

    log(`Running "${ this.extId }" Quasar App Extension...`)
    await script(api)

    return api.__getHooks()
  }

  #stripVersion (packageFullName) {
    const index = packageFullName.indexOf('@')

    return index > -1
      ? packageFullName.substring(0, index)
      : packageFullName
  }

  async #getScriptPrompts () {
    const getPromptsObject = await this.#getScript('prompts')

    if (typeof getPromptsObject !== 'function') return {}

    const PromptsAPI = require('./PromptsAPI')
    const api = new PromptsAPI({ extId: this.extId })

    const inquirer = require('inquirer')
    const prompts = await inquirer.prompt(
      await getPromptsObject(api)
    )

    console.log()
    return prompts
  }

  #installPackage () {
    const nodePackager = require('../helpers/node-packager')
    nodePackager.installPackage(this.packageFullName, { isDevDependency: true })
  }

  #uninstallPackage () {
    const nodePackager = require('../helpers/node-packager')
    nodePackager.uninstallPackage(this.packageFullName)
  }

  /**
   * Returns the file absolute path. If the file cannot be found into the default 'src' folder,
   * searches it into the `dist` folder.
   *
   * This allows to use preprocessors (eg. TypeScript) for all AE files (even index, install and other Quasar-specific scripts)
   * as long as the corresponding file isn't available into the `src` folder, making the feature opt-in
   */
  #getScriptFile (scriptName) {
    if (this.isInstalled === false) return

    return getPackageScriptPath(
      this.packageFullName,
      scriptName,
      this.#packagePath
    )
  }

  async #getScript (scriptName, fatalError) {
    const script = this.#getScriptFile(scriptName)

    if (!script) {
      if (fatalError) {
        fatal(`App Extension "${ this.extId }" has missing ${ scriptName } script...`)
      }

      return
    }

    let fn

    try {
      const { default: defaultFn } = await import(
        pathToFileURL(script)
      )

      fn = defaultFn
    }
    catch (err) {
      console.error(err)

      if (fatalError) {
        fatal(`App Extension "${ this.extId }" > ${ scriptName } script has thrown the error from above.`)
      }
    }

    if (typeof fn !== 'function') {
      if (fatalError) {
        fatal(`App Extension "${ this.extId }" > ${ scriptName } script does not have a default export as a function...`)
      }

      return
    }

    return fn
  }

  async #runInstallScript (prompts) {
    const script = await this.#getScript('install')

    if (typeof script !== 'function') return

    log('Running App Extension install script...')

    const InstallAPI = require('./InstallAPI')

    const api = new InstallAPI({
      extId: this.extId,
      prompts
    })

    await script(api)

    const hooks = api.__getHooks()

    if (hooks.renderFolders.length > 0) {
      for (const entry of hooks.renderFolders) {
        await renderFolders(entry)
      }
    }

    if (hooks.renderFiles.length > 0) {
      for (const entry of hooks.renderFiles) {
        await renderFile(entry)
      }
    }

    if (api.__needsNodeModulesUpdate) {
      const nodePackager = require('../helpers/node-packager')
      nodePackager.install()
    }

    return hooks
  }

  async #runUninstallScript (prompts) {
    const script = await this.#getScript('uninstall')

    if (typeof script !== 'function') return

    log('Running App Extension uninstall script...')

    const UninstallAPI = require('./UninstallAPI')
    const api = new UninstallAPI({
      extId: this.extId,
      prompts
    })

    await script(api)

    return api.__getHooks()
  }
}
