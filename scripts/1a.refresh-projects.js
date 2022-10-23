import axios from 'axios'
import rateLimit from 'axios-rate-limit';
import axiosRetry from 'axios-retry';
import fs from 'fs'

const http = rateLimit(axios.create(), { maxRPS: 3 })
axiosRetry(http, { retries: 3 });

const getArtblockProjects = async function() {
  const getProjects = async function(skip=0) {
    let projects = {}
    try {
      let uri = `https://api.thegraph.com/subgraphs/name/artblocks/art-blocks`
      let query = `{
        projects(
          orderBy: projectId
          orderDirection: desc
          skip: ${skip}
        ) {
          id
          projectId
          contract {
            id
          }
          name
          artistName
          curationStatus
          invocations
          maxInvocations
          tokens(
            first: 1, 
            orderBy: tokenId, 
            orderDirection: asc
          ) {
            id
            tokenId
          }
        }
      }`
      let result = await http.post(uri, JSON.stringify({
        query
      }));
      projects = result.data.data.projects
    } catch(e) {
      console.error(e)
    }
    return projects
  }
  let proceed = true
  let skip = 0
  let projects = {
    data: {
      projects: []
    }
  }
  while (proceed == true) {
    const tmp = await getProjects(skip)
    proceed = tmp.length == 100
    skip = skip + tmp.length
    console.log(tmp, skip)
    projects.data.projects.push(tmp)
  }
  return projects.data.projects.flat();
}

const getOtherProjects = function() {
  const projects = [
    {
      "id": "0xc143bbfcdbdbed6d454803804752a064a622c1f3-1",
      "projectId": "0xc143bbfcdbdbed6d454803804752a064a622c1f3-1",
      "contract": {
        "id": "0xc143bbfcdbdbed6d454803804752a064a622c1f3"
      },
      "name": "Grifters",
      "artistName": "XCOPY",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0xc143bbfcdbdbed6d454803804752a064a622c1f3-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0xaadc2d4261199ce24a4b0a57370c4fcf43bb60aa-1",
      "projectId": "0xaadc2d4261199ce24a4b0a57370c4fcf43bb60aa-1",
      "contract": {
        "id": "0xaadc2d4261199ce24a4b0a57370c4fcf43bb60aa"
      },
      "name": "The Currency",
      "artistName": "Damien Hirst",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0xaadc2d4261199ce24a4b0a57370c4fcf43bb60aa-1",
          "tokenId": "12"
        }
      ]
    },
    {
      "id": "0xd92e44ac213b9ebda0178e1523cc0ce177b7fa96-1",
      "projectId": "0xd92e44ac213b9ebda0178e1523cc0ce177b7fa96-1",
      "contract": {
        "id": "0xd92e44ac213b9ebda0178e1523cc0ce177b7fa96"
      },
      "name": "BEEPLE: EVERYDAYS - THE 2020 COLLECTION",
      "artistName": "Beeple",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0xd92e44ac213b9ebda0178e1523cc0ce177b7fa96-1",
          "tokenId": "100010001"
        }
      ]
    },
    {
      "id": "0x27787755137863bb7f2387ed34942543c9f24efe-1",
      "projectId": "0x27787755137863bb7f2387ed34942543c9f24efe-1",
      "contract": {
        "id": "0x27787755137863bb7f2387ed34942543c9f24efe"
      },
      "name": "Factura",
      "artistName": "Mathias Isaksen",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0x27787755137863bb7f2387ed34942543c9f24efe-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0xbdde08bd57e5c9fd563ee7ac61618cb2ecdc0ce0-1",
      "projectId": "0xbdde08bd57e5c9fd563ee7ac61618cb2ecdc0ce0-1",
      "contract": {
        "id": "0xbdde08bd57e5c9fd563ee7ac61618cb2ecdc0ce0"
      },
      "name": "Crypto Citizens",
      "artistName": "Crypto Citizens",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0xbdde08bd57e5c9fd563ee7ac61618cb2ecdc0ce0-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7-1",
      "projectId": "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7-1",
      "contract": {
        "id": "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7"
      },
      "name": "Meebits",
      "artistName": "Meebits",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7-1",
          "tokenId": "1"
        }
      ]
    },
    {
      "id": "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e-1",
      "projectId": "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e-1",
      "contract": {
        "id": "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e"
      },
      "name": "Doodles",
      "artistName": "Doodles",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0x892848074ddea461a15f337250da3ce55580ca85-1",
      "projectId": "0x892848074ddea461a15f337250da3ce55580ca85-1",
      "contract": {
        "id": "0x892848074ddea461a15f337250da3ce55580ca85"
      },
      "name": "CyberBrokers",
      "artistName": "CyberBrokers",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0x892848074ddea461a15f337250da3ce55580ca85-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0x466cfcd0525189b573e794f554b8a751279213ac-1",
      "projectId": "0x466cfcd0525189b573e794f554b8a751279213ac-1",
      "contract": {
        "id": "0x466cfcd0525189b573e794f554b8a751279213ac"
      },
      "name": "Dooplicator",
      "artistName": "Dooplicator",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0x466cfcd0525189b573e794f554b8a751279213ac-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0xb396b8699f728735f28a31279d07b1d0d2411baa-1",
      "projectId": "0xb396b8699f728735f28a31279d07b1d0d2411baa-1",
      "contract": {
        "id": "0xb396b8699f728735f28a31279d07b1d0d2411baa"
      },
      "name": "Hackatao",
      "artistName": "Hackatao",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0xb396b8699f728735f28a31279d07b1d0d2411baa-1",
          "tokenId": "8100010001"
        }
      ]
    },
    {
      "id": "0xecf7ef42b57ee37a959bf507183c5dd6bf182081-1",
      "projectId": "0xecf7ef42b57ee37a959bf507183c5dd6bf182081-1",
      "contract": {
        "id": "0xecf7ef42b57ee37a959bf507183c5dd6bf182081"
      },
      "name": "Josie",
      "artistName": "Josie",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0xecf7ef42b57ee37a959bf507183c5dd6bf182081-1",
          "tokenId": "1"
        }
      ]
    },
    {
      "id": "0x670d4dd2e6badfbbd372d0d37e06cd2852754a04-1",
      "projectId": "0x670d4dd2e6badfbbd372d0d37e06cd2852754a04-1",
      "contract": {
        "id": "0x670d4dd2e6badfbbd372d0d37e06cd2852754a04"
      },
      "name": "Nina's Super Cool World",
      "artistName": "Nina's Super Cool World",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0x670d4dd2e6badfbbd372d0d37e06cd2852754a04-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0x64780ce53f6e966e18a22af13a2f97369580ec11-1",
      "projectId": "0x64780ce53f6e966e18a22af13a2f97369580ec11-1",
      "contract": {
        "id": "0x64780ce53f6e966e18a22af13a2f97369580ec11"
      },
      "name": "Petro National by John Gerrard",
      "artistName": "Petro National by John Gerrard",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0x64780ce53f6e966e18a22af13a2f97369580ec11-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0x620b70123fb810f6c653da7644b5dd0b6312e4d8-1",
      "projectId": "0x620b70123fb810f6c653da7644b5dd0b6312e4d8-1",
      "contract": {
        "id": "0x620b70123fb810f6c653da7644b5dd0b6312e4d8"
      },
      "name": "Space Doodles",
      "artistName": "Space Doodles",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0x620b70123fb810f6c653da7644b5dd0b6312e4d8-1",
          "tokenId": "0"
        }
      ]
    },
    {
      "id": "0xd78afb925a21f87fa0e35abae2aead3f70ced96b-1",
      "projectId": "0xd78afb925a21f87fa0e35abae2aead3f70ced96b-1",
      "contract": {
        "id": "0xd78afb925a21f87fa0e35abae2aead3f70ced96b"
      },
      "name": "Grails",
      "artistName": "PROOF",
      "invocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "maxInvocations": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "tokens": [
        {
          "id": "0xd78afb925a21f87fa0e35abae2aead3f70ced96b-1",
          "tokenId": "0"
        }
      ]
    }
  ]
  return projects
}

const persistProjects = function (projects, path) {
  let json = JSON.stringify(projects)
  fs.writeFileSync(path, json);
}

const artBlockProjects = await getArtblockProjects()
const otherProjects = getOtherProjects()
const projects = [artBlockProjects, otherProjects].flat()

const cwd = process.cwd()
const projectJsonPath = cwd + '/db/prod/projects.json'
persistProjects(projects, projectJsonPath)