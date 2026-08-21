const fs = require('node:fs')
const path = require('node:path')

const copyRecursiveSync = (src, dest) => {
  if (!fs.existsSync(src)) return
  const stats = fs.statSync(src)
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child))
    }
  } else if (!src.endsWith('.test.js')) {
    fs.copyFileSync(src, dest)
  }
}

const buildDeployPkg = (pkg) => {
  const deployPkg = { ...pkg }
  delete deployPkg.scripts
  delete deployPkg.devDependencies
  delete deployPkg.private
  if (deployPkg.dependencies) {
    const deps = {}
    for (const [k, v] of Object.entries(deployPkg.dependencies)) {
      deps[k] = (typeof v === 'string' && v.startsWith('file:')) ? '^1.0.0' : v
    }
    deployPkg.dependencies = deps
  }
  return deployPkg
}

const updateReadme = (deployDir, tagName, repoUrl) => {
  const readmePath = path.join(deployDir, 'README.md')
  if (!fs.existsSync(readmePath)) return
  let readme = fs.readFileSync(readmePath, 'utf8')
  if (repoUrl) {
    const cleanRepo = repoUrl.replace(/\.git$/, '').replace(/^git\+/, '')
    const baseUrl = `${cleanRepo}/blob/${tagName}`
    readme = readme.replace(/\]\((docs|architecture)\//g, `](${baseUrl}/$1/`)
    readme = readme.replace(/\]\(LICENSE\)/g, `](${baseUrl}/LICENSE)`)
  }
  fs.writeFileSync(readmePath, readme)
}

const deploy = () => {
  const root = __dirname
  const pkgPath = path.join(root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const tagName = `v${pkg.version}`
  const deployDir = path.join(root, '.deploy')

  console.log(`Staging deployment for ${pkg.name}@${pkg.version}...`)

  if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true, force: true })
  fs.mkdirSync(deployDir, { recursive: true })

  const copyDirs = ['lib', 'bin', 'src', 'dist', 'drivers', 'docs']
  for (const dir of copyDirs) {
    const srcDir = path.join(root, dir)
    if (fs.existsSync(srcDir)) copyRecursiveSync(srcDir, path.join(deployDir, dir))
  }

  const rootFiles = ['README.md', 'index.js', 'LICENSE', 'projections.js', 'coms-email.1', 'man.md']
  for (const file of rootFiles) {
    const src = path.join(root, file)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(deployDir, file))
  }

  const deployPkg = buildDeployPkg(pkg)
  fs.writeFileSync(path.join(deployDir, 'package.json'), JSON.stringify(deployPkg, null, 2))

  updateReadme(deployDir, tagName, pkg.repository?.url)
  console.log('Deployment staging complete!')
}

deploy()
