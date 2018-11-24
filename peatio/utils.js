module.exports = {
    quotes: (symbols) => {
        return [...symbols.reduce((a, s) => a.add(s.bid_unit), new Set())]
    }
}
