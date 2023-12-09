async function getResult(phone) {
    const phoneText = String(phone)
      .replaceAll('-', '')
      .replaceAll(' ', '')
      .replace(/(\d{3})(\d{3})(.*)/, `$1-$2-$3`)
    return fetch(`https://www.searchpeoplefree.com/phone-lookup/${phoneText}`)
      .then(res => res.text())
      .then(html => {
        const idx = html.indexOf('Current Owner:')
        if (idx == -1) {
          return ''
        }
        const next = html.substring(idx)
        const start = next.indexOf('<a')
        const end = next.indexOf('</a>')
        if (start == -1 || end == -1) {
          return ''
        }
        return next
          .substring(start, end)
          .replace(/<(.+?)>/g, '')
          .trim()
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
    el.download = 'result.csv'
    el.href = `data:text/csv;charset=utf-8,${encodeURIComponent(text)}`
    el.click()
  }
  
  function parseContent(text) {
    const data = []
    text.split('\n').forEach(line => {
      if (!line.trim()) {
        return
      }
      data.push(line.split(','))
    })
  
    return data
  }
  
  function getCache(key) {
    const obj = JSON.parse(localStorage.getItem('task-cache') || '{}')
    return obj[key]
  }
  
  function setCache(key, value) {
    const obj = JSON.parse(localStorage.getItem('task-cache') || '{}')
    obj[key] = value
    localStorage.setItem('task-cache', JSON.stringify(obj))
  }
  
  async function createNewData(data) {
    const rows = JSON.parse(JSON.stringify(data))
    let phoneIdx = -1
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (i === 0) {
        phoneIdx = row.indexOf('Phone')
        row.unshift('QueryName')
        continue
      }
      console.log('>>>', `${i}/${rows.length - 1}`)
      const phone = row[phoneIdx]
      let result = getCache(phone)
      if (!result) {
        result = await getResult(phone)
      }
      if (result) {
        setCache(phone, result)
      }
      row.unshift(result)
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
  