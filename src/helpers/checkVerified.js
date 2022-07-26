const axios = require('axios')
const path = require('path')
const store = new (require('node-storage'))(path.join(__dirname, '../../user/verifiedTokens.json'))

const isTokenVerifiedBSC = async (config, token) => {
    if (getCachedVerified(token))
        return true

    const res = await axios(`https://api.bscscan.com/api?module=contract&action=getsourcecode&address=${token}&apikey=${config.explorerApikey}`)
    if (res && res.data.status === '1' && res.data.result.length > 0) {
        const verified = !res.data.result[0].ABI.toLowerCase().includes('not verified')
        setCachedVerified(token, verified)
        return verified
    }

    return false
}

const setCachedVerified = (token, verified) => {
    if (verified)
        store.put(token, 'verified')
}

const getCachedVerified = (token) => {
    try {
        const verified = store.get(token) === 'verified'
        return verified
    } catch (e) { return false }
}

module.exports = {
    isTokenVerifiedBSC
}