var App = {}
const API = window.api
const NULL_ADDRESS = '0x000000000000000000000000000000000000000'
const defaultConfigValues = {
    network: 'bsc',
    wssWaitTime: 5,
    saveAndBuy: true,
    buyAmount: 0.01,
    userAddress: NULL_ADDRESS,
    userAddressSell: NULL_ADDRESS,
    secretPhrase: '0000000000000000000000000000000000000',
    pcsRouterContract: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    wbnbContract: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    pcsFactoryContract: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    rpcURL: [
        'https://bsc-dataseed.binance.org',
        'https://bsc-mainnet.nodereal.io/v1/7879c689f5b34260ad2e4ebf962f2f6c',
        'https://bscrpc.com',
        'https://bsc-dataseed1.binance.org',
        'https://rpc.ankr.com/bsc',
        'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3',
    ],
    autoSniping: true,
    tokenAddress: NULL_ADDRESS,
    tokenDecimals: 18,
    minLiquidity: 6.2,
    slippage: 1,
    numBlocksAuto: 5,
    numBlocksWithToken: 5000,
    initBotAuto: true,
    botRunning: false
}

var intervalMonitor

const localData = {
    tokens: []
}

var userConfig = defaultConfigValues
var networkSelectionForm

window.addEventListener('DOMContentLoaded', () => {
    initSelectForm()
    M.Tabs.init(document.getElementsByClassName('tabs')[0])
    M.Tooltip.init(document.querySelectorAll('.tooltipped'))
    M.Collapsible.init(document.querySelectorAll('.collapsible'))
    M.Modal.init(document.querySelectorAll('.modal'))

    App = {
        config: {
            save: document.getElementById("save-config"),
            reset: document.getElementById("reset-config")
        },
        sniper: {
            selectedNetwork: document.querySelectorAll('span[textid="selected-network"]'),
            init: document.getElementById('init'),
            initText: document.getElementById('init_text'),
            minLiquidityText: document.getElementById('min_liquidity_text'),
            initParent: document.getElementById('init_btn_parent'),
            parentList: document.getElementById('tab-sniper'),
            list: document.getElementById('tab-sniper').getElementsByTagName('ul')[0],
            runningLoader: document.getElementById('running_loader'),
            runningLoaderText: document.getElementById('running_loader_text'),
            startButton: document.getElementById('btn_start'),
            noTokens: document.getElementById('sniper_not_tokens'),
            botInitText: document.getElementById('bot_init_text')
        },
        help: {
            goChannel: document.getElementById('go-channel'),
            exitApp: document.getElementById('exit-app'),
            exitAppText: document.getElementById('exit-app-text'),
            restartBot: document.getElementById('restart-bot'),
            restartBotText: document.getElementById('restart-bot-text'),
            initBotAuto: document.getElementById('init_bot_auto')
        }
    }

    API.getConfig().then((data) => {
        loadConfig(data)
        if (userConfig.initBotAuto)
            initBot()
    })
})

function getTokens() {
    API.getTokens().then((data) => {
        if (data.msg === 'success')
            localData.tokens = data.tokens
        else API.saveTokens(localData.tokens)

        setupTokensElements()
    })
}

function initBot(callback) {
    API.initBot().then((data) => {
        loadConfig(data)
        initMonitorTokens()
        if (callback)
            callback(data)
    })
}

function initMonitorTokens() {
    getTokens()
    intervalMonitor = setInterval(function () {
        getTokens()
    }, userConfig.wssWaitTime * 1000)
}

function stopMonitorTokens() {
    clearInterval(intervalMonitor)
}

function loadConfig(data, events) {
    if (data.msg === 'success') {
        userConfig = data.config
        setAppConfig()
    } else if (data.config === undefined) {
        setDefaultConfig()
    }

    restrictTokenFields(document.getElementById('automatic_mode').checked)
    loadEvents()
}

function loadEvents() {
    App.sniper.selectedNetwork.forEach((e) => {
        e.innerText = getNetworkById(userConfig.network)
        e.className = userConfig.network
    })

    App.sniper.minLiquidityText.innerText = `${userConfig.minLiquidity} ${getNetworkCoinSymbol(userConfig.network)}`

    if (userConfig.botRunning) {
        App.sniper.botInitText.classList.remove('red-text')
        App.sniper.botInitText.innerText = 'BOT ENCENDIDO: '
        App.sniper.botInitText.classList.add('green-text')
        App.sniper.startButton.classList.add('hiddendiv')
    } else {
        App.sniper.botInitText.classList.remove('green-text')
        App.sniper.botInitText.innerText = 'BOT APAGADO: '
        App.sniper.botInitText.classList.add('red-text')
    }

    App.sniper.init.onclick = () => {
        disable(App.sniper.initText)
        replaceText(App.sniper.initText, 'Inicializando el bot...')
        initBot((data) => {
            if (data && data.msg === 'success') {
                enable(App.sniper.initText)
                replaceText(App.sniper.initText, 'EMPEZAR')
                App.sniper.startButton.classList.add('hiddendiv')
            }
        })
    }

    App.help.goChannel.onclick = () => {
        openInBrowser('https://www.youtube.com/channel/UCdRihNiJ0tJ7xpFGKcwZcdQ')
    }

    App.help.exitApp.onclick = () => {
        disable(App.help.exitAppText)
        replaceText(App.help.exitAppText, 'DETENIENDO EL BOT...')
        stopMonitorTokens()
        API.exitApp()
    }

    App.help.restartBot.onclick = () => {
        disable(App.help.restartBotText)
        replaceText(App.help.restartBotText, 'REINICIANDO EL BOT...')
        stopMonitorTokens()
        API.restartBot().then((data) => {
            loadConfig(data)
            initMonitorTokens()
            enable(App.help.restartBotText)
            replaceText(App.help.restartBotText, 'REINICIAR BOT')
            msg('Bot reiniciado correctamente!')
        })
    }

    App.help.initBotAuto.addEventListener('change', (e) => {
        userConfig.initBotAuto = e.target.checked
        API.saveConfig(userConfig)
    })

    if (userConfig.initBotAuto) {
        App.sniper.startButton.classList.add('hiddendiv')
    } else if (!userConfig.botRunning) {
        App.sniper.startButton.classList.remove('hiddendiv')
    }

    if (userConfig.botRunning) {
        App.sniper.runningLoader.classList.remove('hiddendiv')
        App.sniper.runningLoaderText.classList.remove('hiddendiv')
    } else {
        App.sniper.runningLoader.classList.add('hiddendiv')
        App.sniper.runningLoaderText.classList.add('hiddendiv')
    }

    document.querySelectorAll("input[name='mode_group']").forEach((input) => {
        input.addEventListener('change', (e) => {
            restrictTokenFields(e.target.id === 'automatic_mode')
        })
    })

    App.config.save.onclick = function (e) {
        disable(e)
        replaceText(e, 'Guardando...')
        getAppConfig()
        saveConfig(e, 'Guardar', 'Configuración guardada')
    }

    App.config.reset.onclick = function (e) {
        disable(e)
        replaceText(e, 'Restableciendo...')
        setDefaultConfig()
        saveConfig(e, 'Restablecer', 'Configuración restablecida')
    }
}

function openInBrowser(link) {
    API.openWebBrowser(link)
}

function setupTokensElements() {
    App.sniper.list.innerHTML = ''
    if (localData.tokens.length > 0) {
        App.sniper.noTokens.classList.add('hiddendiv')
        App.sniper.list.classList.remove('hiddendiv')
        localData.tokens.reverse().forEach((item) => {
            App.sniper.list.innerHTML += getTokenHTML(item)
        })
    } else {
        App.sniper.list.classList.add('hiddendiv')
        App.sniper.noTokens.classList.remove('hiddendiv')
    }
}

function getTokenStatusHTML(status, amount) {
    if (amount > 0)
        return `<div class="col s3">
                <div class="chip green white-text">
                    ${status === 'bought' ? 'Comprado' : 'Vendido'}: ${amount} BNB
                </div>
            </div>`
    return ''
}

function getTokenByAddress(address) {
    return localData.tokens.find(token => {
        return token.address === address
    })
}

function deleteToken(address) {
    localData.tokens = localData.tokens.filter(token => {
        return token.address.toLowerCase() !== address.toLowerCase()
    })

    API.saveTokens(localData.tokens)
    setupTokensElements()
}

function buyToken(address) {
    msg('Comprando token...')
    API.buyToken(getTokenByAddress(address)).then((data) => {
        if (data.msg === 'success') {
            msg('Token comprado correctamente!')
        } else {
            msg('Ha ocurrido un error!')
        }
    })
}

function getBuyButton(token) {
    if (token.buyAmount <= 0 && userConfig.saveAndBuy)
        return `<div class="col s3">
                     <button onclick="buyToken('${token.address}')" class="btn green">Comprar</button>
                 </div>`

    if (token.buyAmount > 0)
        return `<div class="col s3">
                            <button disabled class="btn green">Comprado</button>
                        </div>`

    return ''
}

function getStatusColor(status) {
    return status === 'bought' ? 'green' : 'blue'
}

function getTokenHTML(token) {
    return `<li id="${token.address}">
                <div class="collapsible-header">
                <i class="material-icons ${getStatusColor(token.status)}-text">fiber_manual_record</i>
                <span style="margin-right: 10px">${token.address}</span>
                <div class="chip">
                    <img src="assets/images/${token.network}.png" alt="${token.network}">
                    ${getNetworkById(token.network)}
                </div>
                <span class="badge green">Liquidez: ${token.liquidity.toFixed(2)} BNB</span>
                </div>
                <div class="token-body">
                <div class="row">
                    <div class="col s6">
                    Liquidez: ${token.pair}
                    </div>
                    <div class="col s6">
                    Token: ${token.address}<br>
                    <span>${token.name} (${token.symbol})</span>
                    </div>
                </div>
                <div class="row">
                    ${getTokenStatusHTML('bought', token.buyAmount)}
                    ${getBuyButton(token)}
                    <div class="col s3">
                        <button onclick="openInBrowser('${getNetworkExplorer(token.network, 'token')}${token.address}')" class="btn blue-grey">Ver en bscscan</button>
                    </div>
                    <div class="col s3">
                        <button onclick="deleteToken('${token.address}')" class="btn red">Borrar token</button>
                    </div>
                </div>
                </div>
            </li>`
}

function getNetworkExplorer(network, endpoint) {
    return {
        bsc: `https://bscscan.com/${endpoint}/`,
        ethereum: `https://etherscan.io/${endpoint}/`,
        polygon: `https://polygonscan.com/${endpoint}/`

    }[network]
}

function restrictTokenFields(checked) {
    if (checked) {
        document.getElementById('token_contract').disabled = true
        document.getElementById('token_decimals').disabled = true
    } else {
        document.getElementById('token_contract').disabled = false
        document.getElementById('token_decimals').disabled = false
    }
}

function setDefaultConfig() {
    userConfig = defaultConfigValues
    setAppConfig()
    API.saveConfig(userConfig)
}

function saveConfig(e, btnText, successaText) {
    API.saveConfig(userConfig).then((data) => {
        if (data.msg === 'success') {
            replaceText(e, btnText)
            enable(e)
            msg(successaText)
        }
    })
}

function getAppConfig() {
    const network = document.getElementById('networks')
    const wssWaitTime = document.getElementById('network_time')
    const saveAndBuy = document.getElementById('save_and_buy')
    const buyAmount = document.getElementById('amount_to_buy')
    const userAddress = document.getElementById('user_address')
    const userAddressSell = document.getElementById('user_address_sell')
    const secretPhrase = document.getElementById('secret_pharse')
    const pcsRouterContract = document.getElementById('pcs-router_contract')
    const wbnbContract = document.getElementById('wbnb_contract')
    const pcsFactoryContract = document.getElementById('pcs-factory_contract')
    const autoSniping = document.getElementById('automatic_mode')
    const tokenAddress = document.getElementById('token_contract')
    const tokenDecimals = document.getElementById('token_decimals')
    const minLiquidity = document.getElementById('min_liquidity')
    const slippage = document.getElementById('slippage')
    const numBlocksAuto = document.getElementById('block_number_auto')
    const numBlocksWithToken = document.getElementById('block_number_addr')
    getRpcUrls()

    userConfig.network = network.options[network.selectedIndex < 0 ? 0 : network.selectedIndex].value
        || userConfig.network
    userConfig.wssWaitTime = parseInt(wssWaitTime.value || wssWaitTime.placeholder || userConfig.wssWaitTime)
    userConfig.saveAndBuy = saveAndBuy.checked
    userConfig.buyAmount = parseFloat(buyAmount.value || buyAmount.placeholder || userConfig.buyAmount)
    userConfig.userAddress = userAddress.value || userAddress.placeholder || userConfig.userAddress
    userConfig.userAddressSell = userAddressSell.value || userAddressSell.placeholder || userConfig.userAddressSell
    userConfig.secretPhrase = secretPhrase.value || secretPhrase.placeholder || userConfig.secretPhrase
    userConfig.pcsRouterContract = pcsRouterContract.value || pcsRouterContract.placeholder || userConfig.pcsRouterContract
    userConfig.wbnbContract = wbnbContract.value || wbnbContract.placeholder || userConfig.wbnbContract
    userConfig.pcsFactoryContract = pcsFactoryContract.value || pcsFactoryContract.placeholder || userConfig.pcsFactoryContract
    userConfig.autoSniping = autoSniping.checked
    userConfig.tokenAddress = tokenAddress.value || tokenAddress.placeholder || userConfig.tokenAddress
    userConfig.tokenDecimals = tokenDecimals.value || tokenDecimals.placeholder || userConfig.tokenDecimals
    userConfig.minLiquidity = parseFloat(minLiquidity.value || minLiquidity.placeholder || userConfig.minLiquidity)
    userConfig.slippage = parseFloat(slippage.value || slippage.placeholder || userConfig.slippage)
    userConfig.numBlocksAuto = parseInt(numBlocksAuto.value || numBlocksAuto.placeholder || userConfig.numBlocksAuto)
    userConfig.numBlocksWithToken = parseInt(numBlocksWithToken.value || numBlocksWithToken.placeholder || userConfig.numBlocksWithToken)
    userConfig.initBotAuto = App.help.initBotAuto.checked
}

function getRpcUrls() {
    const rpcURL = document.getElementById('rpc_node_url')
    var urls = rpcURL.value || rpcURL.placeholder
    if (urls && urls !== '') {
        urls = urls.includes(';') ? urls.split(';') : [urls]
        userConfig.rpcURL = urls.filter(url => {
            return url !== ''
        })
    }
}

function setRpcUrls() {
    document.getElementById('rpc_node_url').placeholder = ''
    userConfig.rpcURL.forEach((item) => {
        document.getElementById('rpc_node_url').placeholder += `${item};`
    })
}

function setAppConfig() {
    const network = document.getElementById('networks')

    setSelectedOption(network, userConfig.network)
    setRpcUrls()
    document.getElementById('network_time').placeholder = userConfig.wssWaitTime
    document.getElementById('save_and_buy').checked = userConfig.saveAndBuy
    document.getElementById('just_save').checked = !userConfig.saveAndBuy
    document.getElementById('amount_to_buy').placeholder = userConfig.buyAmount
    document.getElementById('user_address').placeholder = userConfig.userAddress
    document.getElementById('user_address_sell').placeholder = userConfig.userAddressSell
    document.getElementById('secret_pharse').placeholder = userConfig.secretPhrase
    document.getElementById('pcs-router_contract').placeholder = userConfig.pcsRouterContract
    document.getElementById('wbnb_contract').placeholder = userConfig.wbnbContract
    document.getElementById('pcs-factory_contract').placeholder = userConfig.pcsFactoryContract
    document.getElementById('with_token_mode').checked = !userConfig.autoSniping
    document.getElementById('automatic_mode').checked = userConfig.autoSniping
    document.getElementById('token_contract').placeholder = userConfig.tokenAddress
    document.getElementById('token_decimals').placeholder = userConfig.tokenDecimals
    document.getElementById('min_liquidity').placeholder = userConfig.minLiquidity
    document.getElementById('slippage').placeholder = userConfig.slippage
    document.getElementById('block_number_auto').placeholder = userConfig.numBlocksAuto
    document.getElementById('block_number_addr').placeholder = userConfig.numBlocksWithToken
    App.help.initBotAuto.checked = userConfig.initBotAuto
}

function initSelectForm() {
    networkSelectionForm = M.FormSelect.init(document.querySelectorAll('select'))
}

function setSelectedOption(select, option) {
    networkSelectionForm[0].el.options[0].removeAttribute('selected')
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === option) {
            try {
                networkSelectionForm[0].el.selectedIndex = i
                networkSelectionForm[0].el.options[i].setAttribute('selected', '')
                const conserve = networkSelectionForm[0].el.innerHTML
                networkSelectionForm[0].destroy()
                select.innerHTML = conserve
                initSelectForm()
            } catch (err) { }
            return
        }
    }
}

function msg(msg) {
    M.toast({ html: `<span>${msg}</span>`, displayLength: 2000 })
}

function replaceText(element, text) {
    if (element) element.innerText = text
}

function disable(element) {
    if (element) {
        element.disabled = true
        element.className += ' disabled'
    }
}

function enable(element) {
    if (element) {
        element.disabled = false
        element.className = element.className.replace(' disabled', '')
    }
}

function networkIndexex() {
    return {
        bsc: 1,
        ethereum: 2,
        polygon: 3
    }
}

function getNetworkById(id) {
    return {
        bsc: 'Binance Smart Chain',
        ethereum: 'Ethereum',
        polygon: 'Polygon'
    }[id]
}

function getNetworkCoinSymbol(network) {
    return {
        bsc: 'BNB',
        ethereum: 'ETH',
        polygon: 'MATIC'
    }[network]
}