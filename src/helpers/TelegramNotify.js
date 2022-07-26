const axios = require('axios').default
const urlencode = require('urlencode')

const NotifyTelegram = async (config, token, verified) => {
    const content = urlencode(`
    <b>${token.name} (${token.symbol})</b>\n
    <b>Token: </b> ${token.address}\n
    <b>Par de liquidez: </b> ${token.pair}\n
    <b>Liquidez: </b> ${token.liquidity.toFixed(0)} BNB \n
    <b>Contrato Verificado ${verified ? '✅' : '❌'}</b> \n
    <b>Red: </b> Binance Smart Chain \n
    `)

    try {
        await axios.get(`https://api.telegram.org/bot${config.telegramBotTokenId}/sendMessage?chat_id=${config.telegramChatId}&parse_mode=HTML&text=${content}`)
    } catch (err) { }
}

module.exports = {
    NotifyTelegram
}