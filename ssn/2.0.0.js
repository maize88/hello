async function getResult(s) {
  const ssn = String(s).replaceAll('-', '').replaceAll(' ', '')

  const regResult = /(\d{3})(\d{2})(.*)/.exec(ssn)
  if (!regResult) {
    return ''
  }

  const area = regResult[1]
  const group = regResult[2]
  const series = regResult[3]
  const token = 'ZNLNF0ya4We5hIfT54EmQynoGSUnmZ2yPbdyjASR'

  return fetch(`https://www.ssn-verify.com/`, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: `area=${area}&group=${group}&series=${series}&_token=${token}`,
    method: 'POST'
  })
    .then(res => res.text())
    .then(html => {
      const idx1 = html.indexOf('<th>Issuance Location')
      const idx2 = html.indexOf('<th>First Year Issued')

      if (idx1 == -1 || idx2 == -1) {
        return ''
      }
      const str = html.substring(idx1, idx2)

      const result = /\s(\([A-Z\\-]{1,}\))\s/.exec(str)
      if (!result) {
        return ''
      }
      return result[1].replace(/[()]/g, '')
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
  let ssnIdx = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (i === 0) {
      ssnIdx = row.findIndex(name => name.toLowerCase() === 'ssn')
      row.unshift('QueryName')
      continue
    }
    console.log('>>>', `${i}/${rows.length - 1}`)
    const ssn = row[ssnIdx]
    let result = getCache(ssn)
    if (!result) {
      result = await getResult(ssn)
    }
    if (result) {
      setCache(ssn, result)
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
