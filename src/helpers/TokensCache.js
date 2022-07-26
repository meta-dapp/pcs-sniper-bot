const path = require('path')
const store = new (require('node-storage'))
    (path.join(__dirname, '../../user/cachedTokens.json'))

const isTokenCached = (token) => {
    if (getIsTokenCached(token))
        return true
    setTokenCached(token)
    return false
}

const setTokenCached = async (token) => {
    store.put(`cache_${token}`, 'cached')
}

const getIsTokenCached = (token) => {
    try {
        const cached =
            store.get(`cache_${token}`) === 'cached'
        return cached
    } catch (e) { return false }
}

module.exports = {
    isTokenCached
}