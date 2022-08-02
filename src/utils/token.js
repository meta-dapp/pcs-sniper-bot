const getTokenIndexByAddress = (address, tokens) => {
    for (var i = 0; i < tokens.length; i++)
        if (tokens[i].address.toLowerCase() === address.toLowerCase())
            return i

    return undefined
}

module.exports = {
    getTokenIndexByAddress
}