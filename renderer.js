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
        'https://bsc-mainnet.nodereal.io/v1/a986025b4eae4b82b9c2d577c730d09a',
        'https://bscrpc.com',
        'https://bsc-dataseed1.binance.org'
    ],
    autoSniping: true,
    tokenAddress: NULL_ADDRESS,
    tokenDecimals: 18,
    minLiquidity: 6.2,
    slippage: 1,
    numBlocksAuto: 5,
    numBlocksWithToken: 5000,
    initBotAuto: true,
    botRunning: false,
    onlyVerifiedTokens: false,
    explorerApikey: 'apikey del explorador...',
    sendTelegramAlerts: false,
    telegramBotTokenId: 'Token id de tu bot de telegram...',
    telegramChatId: 'Id del chat del grupo donde está tu bot...',
    autoBuy: false,
    sellInProfits: false,
    profitPercent: 10,
    checkScam: true
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
            reset: document.getElementById("reset-config"),
            onlyVerifiedTokens: document.getElementById('only_verified_tokens'),
            explorerApikey: document.getElementById('explorer_apikey'),
            sellInProfits: document.getElementById('sell_in_profits'),
            profitPercent: document.getElementById('profit_percent'),
            sendTelegramAlerts: document.getElementById('send_telegram_alerts'),
            telegramBotTokenId: document.getElementById('telegram_bot_token'),
            telegramChatId: document.getElementById('telegram_chat_id'),
            tokenSymbolText: document.getElementById('token_symbol_text')
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

        console.log(localData.tokens)
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

    App.config.onlyVerifiedTokens.addEventListener('change', (e) => {
        if (e.target.checked)
            enable(App.config.explorerApikey)
        else disable(App.config.explorerApikey)
    })

    App.config.sellInProfits.addEventListener('change', (e) => {
        if (e.target.checked)
            enable(App.config.profitPercent)
        else disable(App.config.profitPercent)
    })

    App.config.sendTelegramAlerts.addEventListener('change', (e) => {
        if (e.target.checked) {
            enable(App.config.telegramBotTokenId)
            enable(App.config.telegramChatId)
        } else {
            disable(App.config.telegramBotTokenId)
            disable(App.config.telegramChatId)
        }
    })
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

function sellToken(address) {
    msg('Vendiendo token...')
    API.sellToken(getTokenByAddress(address)).then((data) => {
        if (data.msg === 'success') {
            msg('Token vendido correctamente!')
        } else {
            msg('Ha ocurrido un error: Prueba de nuevo o honeypot')
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
                    <button onclick="sellToken('${token.address}')" class="btn red">Vender</button>
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
                    <span>${token.name} (${token.symbol}) </span><br>
                    ${getTokenScamHTML(token)}
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
                ${token.status === 'bought' ? '<hr><br>' : ''}
                <div class="row">
                    ${getProfitsHTML(token)}
                </div>
                </div>
            </li>`
}

function getCurrentValue(profit, value) {
    var numerValue = parseFloat(profit.toString().replace('+', '').replace('-', ''))
    numerValue = parseFloat((profit.toString().includes('+') ? numerValue : -1 * numerValue) + value).toFixed(6)
    return profit.toString().includes('+') ? `${numerValue}` : numerValue
}

function getProfitsHTML(token) {
    return token.status === 'bought' ? `<div class="col s2">
                <span class="badge ${token.profitPercent >= 0 ? 'green' : 'red'}">Actual: ${getCurrentValue(token.profit, token.buyAmount)} BNB</span>
            </div>
            <div class="col s3">
                <span class="badge ${token.profitPercent >= 0 ? 'green' : 'red'}">Profit: ${token.profit} BNB</span>
            </div>
            <div class="col s3">
                <span class="badge ${token.profitPercent >= 0 ? 'green' : 'red'}">Profit: ${token.profitPercent}%</span>
            </div>
            <div class="col s4">
                <span class="badge ${token.profitPercent >= 0 ? 'green' : 'red'}">${token.profitText}</span>
            </div>` : ''
}

function getTokenScamHTML(token) {
    return userConfig.checkScam ?
        `<span class="badge scam-badge ${token.isScam ? 'red' : 'blue'}">POSIBLE ${(token.isScam ? 'SCAM' : 'SCAM NO') + ' DETECTADO (BETA: DYOR)'}</span>
        ` : ''

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
        document.getElementById('auto_buy').disabled = true
    } else {
        document.getElementById('token_contract').disabled = false
        document.getElementById('token_decimals').disabled = false
        document.getElementById('auto_buy').disabled = false
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
    const autoBuy = document.getElementById('auto_buy')
    const onlyVerifiedTokens = document.getElementById('only_verified_tokens')
    const sendTelegramAlerts = document.getElementById('send_telegram_alerts')
    const tokenAddress = document.getElementById('token_contract')
    const tokenDecimals = document.getElementById('token_decimals')
    const minLiquidity = document.getElementById('min_liquidity')
    const slippage = document.getElementById('slippage')
    const numBlocksAuto = document.getElementById('block_number_auto')
    const numBlocksWithToken = document.getElementById('block_number_addr')
    const explorerApikey = document.getElementById('explorer_apikey')
    const telegramBotTokenId = document.getElementById('telegram_bot_token')
    const telegramChatId = document.getElementById('telegram_chat_id')
    const checkScam = document.getElementById('check_scam')
    const sellInProfits = document.getElementById('sell_in_profits')
    const profitPercent = document.getElementById('profit_percent')
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
    userConfig.explorerApikey = explorerApikey.value || explorerApikey.placeholder || userConfig.explorerApikey
    userConfig.telegramBotTokenId = telegramBotTokenId.value || telegramBotTokenId.placeholder || userConfig.telegramBotTokenId
    userConfig.telegramChatId = telegramChatId.value || telegramChatId.placeholder || userConfig.telegramChatId
    userConfig.wbnbContract = wbnbContract.value || wbnbContract.placeholder || userConfig.wbnbContract
    userConfig.pcsFactoryContract = pcsFactoryContract.value || pcsFactoryContract.placeholder || userConfig.pcsFactoryContract
    userConfig.autoSniping = autoSniping.checked
    userConfig.autoBuy = autoBuy.checked
    userConfig.checkScam = checkScam.checked
    userConfig.sellInProfits = sellInProfits.checked
    userConfig.tokenAddress = tokenAddress.value || tokenAddress.placeholder || userConfig.tokenAddress
    userConfig.tokenDecimals = tokenDecimals.value || tokenDecimals.placeholder || userConfig.tokenDecimals
    userConfig.minLiquidity = parseFloat(minLiquidity.value || minLiquidity.placeholder || userConfig.minLiquidity)
    userConfig.slippage = parseFloat(slippage.value || slippage.placeholder || userConfig.slippage)
    userConfig.numBlocksAuto = parseInt(numBlocksAuto.value || numBlocksAuto.placeholder || userConfig.numBlocksAuto)
    userConfig.numBlocksWithToken = parseInt(numBlocksWithToken.value || numBlocksWithToken.placeholder || userConfig.numBlocksWithToken)
    userConfig.initBotAuto = App.help.initBotAuto.checked
    userConfig.onlyVerifiedTokens = onlyVerifiedTokens.checked
    userConfig.sendTelegramAlerts = sendTelegramAlerts.checked
    userConfig.profitPercent = parseFloat(profitPercent.value || profitPercent.placeholder || userConfig.profitPercent).toFixed(1)
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

    getDefaultConfigUnique()

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
    document.getElementById('only_verified_tokens').checked = userConfig.onlyVerifiedTokens
    document.getElementById('explorer_apikey').placeholder = userConfig.explorerApikey
    document.getElementById('send_telegram_alerts').checked = userConfig.sendTelegramAlerts
    document.getElementById('telegram_bot_token').placeholder = userConfig.telegramBotTokenId
    document.getElementById('telegram_chat_id').placeholder = userConfig.telegramChatId
    document.getElementById('auto_buy').checked = userConfig.autoBuy
    document.getElementById('profit_percent').placeholder = userConfig.profitPercent
    document.getElementById('sell_in_profits').checked = userConfig.sellInProfits
    document.getElementById('check_scam').checked = userConfig.checkScam
}

function getDefaultConfigUnique() {
    Object.keys(defaultConfigValues).forEach((key) => {
        if (!(key in userConfig))
            userConfig[key] = defaultConfigValues[key]
    })
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
                replaceText(App.config.tokenSymbolText, getNetworkCoinSymbol(userConfig.network))
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
        polygon: 'MATIC',
        avalanche: 'AVAX'
    }[network]
}