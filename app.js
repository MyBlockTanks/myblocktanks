let players = []
let matches = []

function refreshDropdowns() {
  let selects = {
    player1: document.getElementById("player1"),
    player2: document.getElementById("player2"),
    approvedBy: document.getElementById("approvedBy"),
  }

  for (let key in selects) {
    let select = selects[key]
    select.innerHTML = ""
    players.forEach(p => {
      if (key === "approvedBy" && !p.isOfficial) return
      let option = document.createElement("option")
      option.value = p.username
      option.text = p.username
      select.appendChild(option)
    })
  }
}

function addPlayer() {
  let username = document.getElementById("username").value.trim()
  let userKdr = parseFloat(document.getElementById("userKdr").value.trim())
  let isOfficial = document.getElementById("isOfficial").checked

  if (!username || isNaN(userKdr)) return alert("Username and K/D are required.")
  if (players.some(p => p.username === username)) return alert("Username already exists.")

  players.push({ username, isOfficial, userKdr })
  refreshDropdowns()
  refreshLeaderboard()

  document.getElementById("username").value = ""
  document.getElementById("userKdr").value = ""
  document.getElementById("isOfficial").checked = false
}

function addMatch() {
  let player1 = document.getElementById("player1").value
  let player2 = document.getElementById("player2").value
  let score = document.getElementById("score").value.trim()
  let approvedBy = document.getElementById("approvedBy").value
  if (player1 === player2) return alert("Players must be different.")
  if (!score || !approvedBy) return alert("All fields are required.")
  matches.push({ player1, player2, score, approvedBy })
  refreshLeaderboard()
  document.getElementById("score").value = ""
}

function calculateStats() {
  let stats = {}
  players.forEach(p => {
    stats[p.username] = {
      matches: 0, wins: 0, losses: 0, draws: 0,
      kills: 0, deaths: 0, kd: 0, points: 0,
      userKdr: p.userKdr
    }
  })

  matches.forEach(m => {
    let [s1, s2] = m.score.split("-").map(Number)
    if (isNaN(s1) || isNaN(s2)) return

    let p1 = stats[m.player1]
    let p2 = stats[m.player2]

    p1.matches++
    p2.matches++
    p1.kills += s1
    p1.deaths += s2
    p2.kills += s2
    p2.deaths += s1

    if (s1 > s2) {
      p1.wins++
      p2.losses++
    } else if (s2 > s1) {
      p2.wins++
      p1.losses++
    } else {
      p1.draws++
      p2.draws++
    }
  })

  for (let user in stats) {
    let s = stats[user]
    s.kd = s.deaths === 0 ? s.kills : (s.kills / s.deaths).toFixed(2)
  }

  matches.forEach(m => {
    let [s1, s2] = m.score.split("-").map(Number)
    if (isNaN(s1) || isNaN(s2)) return

    let p1 = stats[m.player1]
    let p2 = stats[m.player2]

    let kdr1 = parseFloat(p1.kd)
    let kdr2 = parseFloat(p2.kd)

    let winner = null

    if (s1 === s2) {
      let scale1 = kdr1 > kdr2 ? 1 : kdr1 === kdr2 ? 1.5 : 2
      let scale2 = kdr2 > kdr1 ? 1 : kdr2 === kdr1 ? 1.5 : 2
      p1.points += s1 * scale1
      p2.points += s2 * scale2
    }
    else {
      let p1Base = 12 * ((5 * s1 - 4 * s2) / 5) + 15 + 12 * (p2.userKdr - p1.userKdr)
      let p2Base = 12 * ((5 * s2 - 4 * s1) / 5) + 15 + 12 * (p1.userKdr - p2.userKdr)

      if (s1 > s2) {
        winner = m.player1
        p1.points += p1Base
        p2.points -= p1Base
      }
      else {
        winner = m.player2
        p2.points += p2Base
        p1.points -= p2Base
      }
    }
    m.winner = winner
  })
  return stats
}

function refreshLeaderboard() {
  let stats = calculateStats()
  let tbody = document.querySelector("#leaderboardTable tbody")
  let data = Object.entries(stats).map(([username, s]) => ({ username, ...s }))
  data.sort((a, b) => b.points - a.points)

  tbody.innerHTML = ""
  data.forEach((p, i) => {
    let row = tbody.insertRow()
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.username}</td>
      <td>${p.matches}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td>${p.draws}</td>
      <td>${p.kills}</td>
      <td>${p.deaths}</td>
      <td>${p.kd}</td>
      <td>${formatRoundedPoints(p.points)}</td>
    `
  })
}

function exportJSON() {
  let blob = new Blob([JSON.stringify({ players, matches }, null, 2)], { type: "application/json" })
  let url = URL.createObjectURL(blob)
  let a = document.createElement("a")
  a.href = url
  a.download = "league_data.json"
  a.click()
  URL.revokeObjectURL(url)
}

function importJSON(event) {
  let file = event.target.files[0]
  if (!file) return
  let reader = new FileReader()
  reader.onload = () => {
    try {
      let data = JSON.parse(reader.result)
      players.length = 0
      matches.length = 0
      data.players.forEach(p => players.push(p))
      data.matches.forEach(m => matches.push(m))
      refreshDropdowns()
      refreshLeaderboard()
    } catch {
      alert("Invalid JSON.")
    }
  }
  reader.readAsText(file)
}

function exportStatsImage() {
  let canvas = document.getElementById("exportCanvas")
  let ctx = canvas.getContext("2d")

  let stats = calculateStats()
  let data = Object.entries(stats).map(([username, s]) => ({ username, ...s }))
  data.sort((a, b) => b.points - a.points)

  let columns = [
    "Position", "User", "Matches", "Wins", "Losses", "Draws", "Kills", "Deaths", "K/D", "Points"
  ]
  let colWidths = [80, 160, 80, 80, 80, 80, 80, 80, 80, 100]
  let rowHeight = 40
  let headerHeight = 50

  let width = colWidths.reduce((a, b) => a + b, 0) + 1
  let height = headerHeight + data.length * rowHeight + 1

  canvas.width = width
  canvas.height = height

  ctx.clearRect(0, 0, width, height)
  ctx.font = "16px Inter"
  ctx.textBaseline = "middle"
  ctx.textAlign = "center"

  let x = 0
  for (let i = 0; i < columns.length; i++) {
    ctx.fillStyle = "goldenrod"
    ctx.fillRect(x, 0, colWidths[i], headerHeight)
    ctx.fillStyle = "white"
    ctx.fillText(columns[i], x + colWidths[i] / 2, headerHeight / 2)
    x += colWidths[i]
  }

  data.forEach((p, i) => {
    let y = headerHeight + i * rowHeight
    let isEven = i % 2 === 0
    ctx.fillStyle = isEven ? "red" : "blue"
    ctx.fillRect(0, y, width, rowHeight)

    ctx.fillStyle = "white"
    let row = [
      (i + 1), p.username, p.matches, p.wins, p.losses, p.draws,
      p.kills, p.deaths, p.kd, formatRoundedPoints(p.points)
    ]

    let xPos = 0
    for (let j = 0; j < row.length; j++) {
      ctx.fillText(String(row[j]), xPos + colWidths[j] / 2, y + rowHeight / 2)
      xPos += colWidths[j]
    }
  })

  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 1

  let xPos = 0
  for (let i = 0; i <= colWidths.length; i++) {
    ctx.beginPath()
    ctx.moveTo(xPos + 0.5, 0)
    ctx.lineTo(xPos + 0.5, height)
    ctx.stroke()
    xPos += colWidths[i] || 0
  }

  let totalRows = data.length + 1
  for (let i = 0; i <= totalRows; i++) {
    let y = i === 0 ? 0 : headerHeight + (i - 1) * rowHeight
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
    ctx.stroke()
  }

  let link = document.createElement("a")
  link.href = canvas.toDataURL("image/png")
  link.download = "leaderboard.png"
  link.click()
}

function formatNumber(n) {
  n = Number(n)
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(2).replace(/\.?0+$/, "")
}

function formatRoundedPoints(n) {
  return Math.round(n).toString()
}
