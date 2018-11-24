const request = require('request')

module.exports = class PeatioAPI {
    time() {
        return this.request('/api/v2/timestamp')
    }

    exchangeInfo() {
        return this.request('/api/v2/markets')
    }

    klines(market, period, time_from, time_to, limit) {
        return this.request('/api/v2/k?market='+market+'&period='+period+'&time_from='+time_from+'&time_to='+time_to+'&limit='+limit)
    }

    request(path, options) {
		console.log(path)
        return new Promise((resolve, reject) => {
            request('http://api.wb.local' + path, options, (err, res, body) => {
                if (err) return reject(err)
    
                try {
                    const json = JSON.parse(body)
                    if (json.code) return reject(new Error(`${json.code}: ${json.msg}`))
                    resolve(json)
                } catch (err) {
                    reject(err)
                }
            })
        })
    }
}
