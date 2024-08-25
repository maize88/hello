;(function () {
  async function loadPapa() {
    const url = 'https://unpkg.com/papaparse@5.4.1/papaparse.min.js'
    return new Promise((resolve, reject) => {
      if (!window.Papa) {
        const script = document.createElement('script')
        script.src = url
        script.onload = () => resolve(window.Papa)
        script.onerror = () => reject(new Error('Failed to load script'))
        document.head.appendChild(script)
      }
      if (window.Papa) {
        resolve(window.Papa)
      }
    })
  }

  async function loadCSV() {
    let resolve
    const promise = new Promise(r => (resolve = r))

    const el = document.createElement('input')
    el.type = 'file'

    el.addEventListener('change', e => {
      document.body.removeChild(el)
      const file = e.target.files[0]
      if (!file) {
        resolve('')
        return
      }
      const reader = new FileReader()
      reader.addEventListener('load', e => {
        const text = e.target.result
        resolve(text)
      })
      reader.addEventListener('error', e => {
        console.error(e)
        resolve('')
      })
      reader.readAsText(file)
    })

    document.body.appendChild(el)
    el.click()

    return promise
  }

  function saveCSV(text) {
    const el = document.createElement('a')
    el.download = 'result.csv'
    el.href = `data:text/csv;charset=utf-8,${encodeURIComponent(text)}`
    el.click()
  }

  function getEmails(csvData) {
    const results = []
    if (!Array.isArray(csvData)) return results

    csvData.forEach(item => {
      const email = (item.email || item.Email || '').trim()
      if (email && results.indexOf(email) === -1) {
        results.push(email)
      }
    })

    return results
  }

  function parse(el) {
    const result = { name: '', address: '', phone: '' }

    try {
      const e1 = el.querySelector('h2 a')
      const e2 = el.querySelector('address a')
      if (e1 && e1.childNodes[0]) {
        result.name = (e1.childNodes[0].nodeValue || '').trim()
      }
      if (e2) {
        result.address = (e2.innerText || '').trim()
      }
      const list = el.querySelectorAll('a')

      for (let i = 0; i < list.length; i++) {
        const e3 = list[i]
        if (e3.href && e3.href.indexOf('/phone-lookup/') !== -1) {
          result.phone = (e3.innerText || '').trim()
          break
        }
      }
    } catch (err) {
      console.error(err)
    }
    return result
  }

  function pathify(n) {
    return (n + '').trim().toLowerCase().replace(/ /g, '-')
  }

  function base64url_encode(n) {
    var t = unescape(encodeURIComponent(n))
    return base64_encode_data(t, t.length, b64u)
  }

  function getResultUrl(email) {
    var n = { value: email },
      r = (n.value + '').replace(/-/gi, '~').replace(/\./gi, '-'),
      g = r.contains('@'),
      i = r != undefined && r.length > 0 && g
    g &&
      ((h = r.substring(r.indexOf('@') + 1).toLowerCase()),
      (c = r.substring(0, r.indexOf('@'))),
      h == undefined || h.length == 0 ? (i = !1) : (c == undefined || c.length == 0) && (i = !1),
      (r = pathify(c) + '/' + base64url_encode(h)))
    // i ? (t != undefined && t.loading(), (window.location = pathify(_g.p[_g.t]) + r)) : showError(n, 'input_email_error')
    return pathify(_g.p[_g.t]) + r
  }

  async function search(email) {
    const url = location.origin + getResultUrl(email)
    return fetch(url)
      .then(resp => resp.text())
      .then(html => {
        const div = document.createElement('div')
        div.innerHTML = html
        return [...div.querySelectorAll('.toc')]
      })
      .then(list => {
        const results = []
        list.forEach(el => {
          const result = parse(el)
          if (result.name && result.address && result.phone) {
            results.push(result)
          }
        })
        return results
      })
  }

  async function main() {
    await loadPapa()

    const csvText = await loadCSV()
    if (!csvText) return

    const csvData = Papa.parse(csvText, { header: true }).data
    const emails = getEmails(csvData)

    const outData = []
    const caches = JSON.parse(localStorage.getItem('caches') || '{}')

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i]
      console.log(`${i + 1}/${emails.length} ${email}`)
      let result = caches[email]
      if (!result) {
        try {
          result = await search(email)
          caches[email] = result
          localStorage.setItem('caches', JSON.stringify(caches))
        } catch (err) {
          console.error(err)
        }
      }

      if (result) {
        result.forEach(item => {
          outData.push({ email, name: item.name, address: item.address, phone: item.phone })
        })
      }
    }

    saveCSV(Papa.unparse(outData))
  }

  window.main = main

})()
