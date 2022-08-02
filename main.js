// Modules to control application life and create native browser window
const chalk = require('chalk')
const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const { CheckScam } = require('./src/helpers/checkScam')
const { checkProfits } = require('./src/helpers/profits')
const store = new (require('node-storage'))(path.join(__dirname, 'user/config.json'))

const sleep = (timeMs) => new Promise(resolve => setTimeout(resolve, timeMs))
const { Init, Stop, Buy, Sell } = require('./src/sniper')
const { getTokenIndexByAddress } = require('./src/utils/token')

var isBotRunning = false

process.on('uncaughtException', function (error) {
  console.log('-----RATE LIMIT/TIMEOUT-----')
})
process.on('UnhandledPromiseRejectionWarning', function (error) {
  console.log('-----RETRY-----')
})

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  Menu.setApplicationMenu(null)
  if (process.argv[2] === 'dev')
    mainWindow.webContents.openDevTools()

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

/// EVENTS
ipcMain.handle('save-config', async (event, data) => {
  return _saveConfig(data)
})
ipcMain.handle('get-config', async (event) => {
  return await _getConfig()
})
ipcMain.handle('exit-app', async (event, data) => {
  await _stopBot()
  await sleep(2000)
  app.exit(0)
})

ipcMain.handle('restart-bot', async (event, data) => {
  await _stopBot()
  await sleep(2000)
  return await _initBot()
})

ipcMain.handle('init-bot', async (event, data) => {
  return await _initBot()
})

ipcMain.handle('get-tokens', async (event) => {
  return _getTokens()
})

ipcMain.handle('save-tokens', async (event, data) => {
  return _saveTokens(data)
})

ipcMain.handle('buy-token', async (event, data) => {
  return await _buyToken(data)
})
ipcMain.handle('sell-token', async (event, data) => {
  return await _sellToken(data)
})

/// FUNCTIONS
async function _saveConfig(data) {
  Object.keys(data).forEach((key) => {
    store.put(`config.${key}`, data[key])
  })

  await _stopBot()
  await _initBot()

  return {
    msg: 'success'
  }
}

function _saveTokens(data) {
  store.put('tokens', data)
}

async function _getConfig() {
  const config = store.get('config') || undefined
  if (config) {
    config['botRunning'] = isBotRunning
    store.put('config', config)
  }

  return {
    msg: config ? 'success' : 'error',
    config
  }
}

function _getTokens() {
  var tokens = store.get('tokens') || undefined
  return {
    msg: tokens ? 'success' : 'error',
    tokens
  }
}

async function _initBot() {
  await Init(store)
  isBotRunning = true
  broadcastTokens()
  return await _getConfig()
}

async function _buyToken(token) {
  try {
    await Buy(token, store)

    await sleep(1000)
    return {
      msg: 'success'
    }
  } catch (err) {
    return {
      msg: 'error'
    }
  }
}

async function _sellToken(token) {
  try {
    await Sell(token, store)
    const tokenIndex = getTokenIndexByAddress(token.address, store.get('tokens'))
    if (tokenIndex)
      store.get('tokens').slice(tokenIndex, 1)

    await sleep(1000)
    return {
      msg: 'success'
    }
  } catch (err) {
    return {
      msg: 'error'
    }
  }
}

async function broadcastTokens() {
  while (true) {
    const tokens = store.get('tokens')
    const config = store.get('config')

    if (tokens && tokens.length > 0)
      for (var i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        if (config.checkScam && !token.isScam) {
          try {
            console.log(chalk.red('Checking SCAM...'))
            const isScam = await CheckScam(token, config)
            token['isScam'] = isScam
          } catch (err) { }
        }

        if (token.status === 'bought') {
          try {
            console.log(chalk.blue('Checking Profits...'))
            const response = await checkProfits(token.address)
            token['profit'] = response.profitPercent < 0 ? `-${response.profit.toString().replace('-', '').replace('+', '')}` : `+${response.profit.toString().replace('+', '').replace('-', '')}`
            token['profitText'] = response.msg
            token['profitPercent'] = response.profitPercent < 0 ? `-${response.profitPercent.toString().replace('-', '')}` : `+${response.profitPercent.toString().replace('+', '')}`
          } catch (err) { }

        }
      }

    store.put('tokens', tokens)
    await sleep(6000)
  }
}

async function _stopBot() {
  Stop()
  isBotRunning = false
  return await _getConfig()
}
