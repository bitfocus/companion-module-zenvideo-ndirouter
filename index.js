import { runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { TCPHelper, Regex } from '@companion-module/base'
import { compileActionDefinitions } from './actions.js'
import { GetVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { GetFeedbackDefinitions } from './feedbacks.js'

class ZNRInstance extends InstanceBase {
	sendCmd = async (cmd) => {
		if (this.socket !== undefined && this.socket.isConnected) {
			if (this.debugLevel > 0) {
				this.log('debug', `send: ${cmd}`)
			}
			this.socket.send(cmd + '\r')
		} else {
			this.log('debug', 'Socket not connected :(')
		}
	}

	pad0(num, len = 2) {
		const zeros = '0'.repeat(len)
		return (zeros + num).slice(-len)
	}

	constructor(internal) {
		super(internal)
		this.MAX_INPUTS = 20
		this.MAX_OUTPUTS = 24
	}

	async init(config) {
		this.startup(config)
	}

	async configUpdated(config) {
		// stop all timers and reset connection
		this.destroy(true)
		this.startup(config)
	}

	// When module gets deleted
	destroy(restart) {
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}

		if (this.poll_interval !== undefined) {
			clearInterval(this.poll_interval)
			delete this.poll_interval
		}

		if (this.restartTimer !== undefined) {
			clearInterval(this.restartTimer)
			delete this.restartTimer
		}

		if (!restart) {
			this.log('debug', `Destroy ${this.id}`)
			this.updateStatus(InstanceStatus.Disconnected, 'Disabled')
		}
	}

	startup(config) {
		// saves typing ;)
		function chr(asc) {
			return String.fromCharCode(asc)
		}

		const A = 'A'.charCodeAt(0)
		this.config = config
		this.debugLevel = process.env.DEVELOPER ? 2 : 0

		this.attached = false
		this.router = {}
		this.router.name = ''
		this.router.number = 0
		this.router.inputs = 0
		this.router.outputs = 0
		this.router.inp = []
		this.router.out = []
		this.router.pre = []
		this.router.preset = 0

		this.setVariableDefinitions(GetVariableDefinitions(this))

		for (let i = 1; i <= this.MAX_INPUTS; i++) {
			const base = `i_${this.pad0(i)}_`
			const rname = `Input ${i}`
			this.router.inp.push({
				name: rname,
				net: '',
				valid: false,
				outs: new Set([]),
			})
			this.setVariableValues({
				[base + 'u']: false,
				[base + 'n']: rname,
				[base + 't']: 'None',
				[base + 'v']: false,
			})
		}

		for (let i = 1; i <= this.MAX_OUTPUTS; i++) {
			const obase = `o_${this.pad0(i)}_`
			const rname = `Output ${chr(i - 1 + A)}`
			const pbase = `p_${this.pad0(i)}_`
			const pname = `Preset ${i}`

			this.router.out.push({
				name: rname,
				inp: -1,
			})
			this.router.pre.push({
				name: pname,
				valid: false,
				active: false,
			})
			this.setVariableValues({
				[obase + 'n']: rname,
				[obase + 's']: -1,

				[pbase + 'v']: false,
				[pbase + 'n']: pname,
				[pbase + 'u']: false,
			})
		}
		this.setFeedbackDefinitions(GetFeedbackDefinitions(this))
		this.setActionDefinitions(compileActionDefinitions(this))

		this.init_tcp()
	}

	init_tcp() {
		let receivebuffer = ''

		if (this.socket !== undefined) {
			this.socket.removeAllListeners()
			this.socket.destroy()
			delete this.socket
			this.attached = false
		}

		if (this.config.host && this.config.port) {
			this.socket = new TCPHelper(this.config.host, this.config.port)

			this.socket.on('connect', () => {
				this.log('info', `Connected to ${this.config.host}`)
				this.attached = false
			})

			this.socket.on('end', () => {
				this.log('warn', 'Disconnected')
				this.attached = false
				this.updateStatus(InstanceStatus.Disconnected)
			})

			this.socket.on('error', (err) => {
				this.log('error', 'Network error: ' + err.message)
				this.attached = false
				this.updateStatus(InstanceStatus.UnknownError, err.message)
			})

			// split data into separate lines
			this.socket.on('data', (chunk) => {
				let i = 0,
					line = '',
					offset = 0
				receivebuffer += chunk
				while ((i = receivebuffer.indexOf('\r\n', offset)) !== -1) {
					line = receivebuffer.slice(offset, i)
					offset = i + 2
					this.socket?.emit('receiveline', line.toString())
				}
				receivebuffer = receivebuffer.slice(offset)
			})

			this.socket.on('receiveline', (line) => {
				if (!['ACK', 'NAK'].includes(line)) {
					if (!this.attached) {
						this.attached = true
						this.updateStatus(InstanceStatus.Ok)
						this.sendCmd('ON 00 00')
						this.sendCmd('IN 00 01')
						this.sendCmd('IN 00 02')
						this.sendCmd('IV 00 00')
						this.sendCmd('OR 00 00')
						this.sendCmd('PV 00 00')
						this.sendCmd('PR 00 00')
						this.sendCmd('PN 00 00')
					}
					if ('' != line) {
						this.incomingData(line)
					}
				}
			})
		}
	}

	incomingData(line) {
		const pad0 = this.pad0
		const rtr = this.router
		const resp = line.slice(0, 2)

		const v1 = parseInt(line.slice(3, 5))
		const v2 = parseInt(line.slice(6, 8))
		let newVal = ['BN', 'ON', 'IN', 'PN'].includes(resp) ? line.slice(9, 9 + v2) : ''
		let vn = ''

		if (this.debugLevel > 0) {
			this.log('debug', `recv: ${line}`)
		}

		switch (resp) {
			case 'CR':
				this.router.outputs = v2
				this.router.inputs = v1
				this.setVariableValues({ n_ins: v1, n_outs: v2 })
				break

			case 'IN':
				// which name reply? name, net, both
				const n = v1 > 64 ? 64 : v1 > 32 ? 32 : 0
				const i = v1 - n

				if (64 == n && newVal != '') {
					vn = `i_${pad0(i)}_t`
					rtr.inp[i - 1].net = newVal
				} else if (n <= 32 && newVal != '') {
					vn = `i_${pad0(i)}_n`
					rtr.inp[i - 1].name = newVal
				}
				break
			case 'ON':
				rtr.out[v1 - 1].name = newVal
				vn = `o_${pad0(v1)}_n`
				break
			case 'BN': // has both router number and name
				rtr.number = v1
				this.setVariableValues({ number: v1, name: newVal })
				rtr.name = newVal
				break
			case 'OS':
				const oi = rtr.out[v1 - 1].inp
				if (oi > 0) {
					rtr.inp[oi - 1].outs.delete(v1 - 1)
					this.setVariableValues({ [`i_${pad0(oi)}_u`]: !!(rtr.inp[oi - 1].outs.size > 0) })
				}
				rtr.out[v1 - 1].inp = v2
				newVal = v2
				vn = `o_${pad0(v1)}_s`
				if (v2 > 0) {
					rtr.inp[v2 - 1].outs.add(v1 - 1)
					this.setVariableValues({ [`i_${pad0(v2)}_u`]: !!(rtr.inp[v2 - 1].outs.size > 0) })
				}
				this.checkFeedbacks('routed', 'inp_use')
				break
			case 'IV':
				newVal = !!v2
				rtr.inp[v1 - 1].valid = newVal
				vn = `i_${pad0(v1)}_v`
				this.checkFeedbacks('inp_ok')
				break
			case 'PV':
				newVal = !!v2
				rtr.pre[v1 - 1].valid = newVal
				vn = `p_${pad0(v1)}_v`
				this.checkFeedbacks('pre_ok')
				break
			case 'PS':
				const op = rtr.preset
				newVal = !!v2
				if (!newVal || op != v1) {		// un-set preset ?
					if (op > 0) {
						rtr.pre[op - 1].active = false
						this.setVariableValues({ [`p_${pad0(op)}_u`]: false })
					}
				}
				rtr.preset = v1
				if (v1 > 0) {
					// we can assume a response here means the preset is valid
					rtr.pre[v1 - 1].valid = true
					this.setVariableValues({ [`p_${pad0(op)}_v`]: true })
					rtr.pre[v1 - 1].active = newVal
					this.setVariableValues({ [`p_${pad0(op)}_a`]: newVal })
				}
				this.checkFeedbacks('pre_use','pre_ok')
				break
			case 'PN':
				rtr.pre[v1 - 1].name = newVal
				vn = `p_${pad0(v1)}_n`
				break
		}
		if ('' != vn) {
			this.setVariableValues({ [vn]: newVal })
		}
	}

	// Fields for web config
	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module is for the Zen NDI Router',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Router IP address',
				width: 12,
				default: '192.168.1.1',
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Router Port number',
				default: '9779',
				regex: Regex.PORT,
			},
		]
	}
}

runEntrypoint(ZNRInstance, UpgradeScripts)
