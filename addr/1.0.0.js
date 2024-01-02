async function getKey() {
    const text = await fetch('https://www.truepeoplesearch.com/bundles/js?t=' + Date.now()).then(resp => resp.text())
    const resp = /lookup\?key=(.+?)&/.exec(text)
    return resp[1]
  }
  
  async function getResult(key, address, state) {
    let url = 'https://us-autocomplete-pro.api.smartystreets.com/lookup'
    url += '?key=' + key
    url += '&search=' + encodeURIComponent(address)
    url += '&max_results=' + 5
  
    return fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.suggestions) && data.suggestions.length) {
          const suggestions = data.suggestions
          const idx = suggestions.findIndex(item => item.state.toLowerCase() == state.toLowerCase())
          if (idx >= 0) {
            return suggestions[idx].zipcode
          }
          return suggestions[0].zipcode
        }
        return ''
      })
      .catch(e => {
        console.error(e)
        return ''
      })
  }
  
  async function readText() {
    let resolve
    const promise = new Promise(r => (resolve = r))
  
    const el = document.createElement('input')
    el.type = 'file'
  
    el.addEventListener('change', e => {
      document.body.removeChild(el)
      const file = e.target.files[0]
      if (!file) {
        resolve()
        return
      }
      const reader = new FileReader()
      reader.addEventListener('load', e => {
        const text = e.target.result
        resolve(text)
      })
      reader.addEventListener('error', e => {
        console.error(e)
        resolve()
      })
      reader.readAsText(file)
    })
  
    document.body.appendChild(el)
    el.click()
  
    return promise
  }
  
  function saveText(text) {
    const el = document.createElement('a')
    el.download = 'address-result.csv'
    el.href = `data:text/csv;charset=utf-8,${encodeURIComponent(text)}`
    el.click()
  }
  
  function parseContent(text) {
    const data = []
    text.split('\n').forEach(line => {
      if (!line.trim()) {
        return
      }
      const arr = line.split(',').map(item => {
        return item.replace('\r', '').trim()
      })
      if (arr.join('') != '') {
        data.push(arr)
      }
    })
  
    return data
  }
  
  async function createNewData(data) {
    const rows = JSON.parse(JSON.stringify(data))
    let addressIdx = -1
    let stateIdx = -1
  
    console.log('>>>', 'query key')
    const key = await getKey()
  
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (i === 0) {
        addressIdx = row.findIndex(name => name.toLowerCase() === 'address')
        stateIdx = row.findIndex(name => name.toLowerCase() === 'state')
        row.splice(stateIdx + 1, 0, 'QueryResult')
        continue
      }
  
      const address = row[addressIdx]
      const state = row[stateIdx]
  
      const result = await getResult(key, address, state)
      console.log('>>>', `${i}/${rows.length - 1}`, '|', address, '|', state, '|', result || '-')
      row.splice(stateIdx + 1, 0, result)
    }
    return rows
  }
  
  function createDownload(result) {
    let text = ''
    for (let i = 0; i < result.length; i++) {
      const row = result[i]
      text += row.join(',') + '\n'
    }
    saveText(text)
  }
  
  async function main() {
    const text = await readText()
    const data = parseContent(text)
    const result = await createNewData(data)
    createDownload(result)
  }
  
  main()
  