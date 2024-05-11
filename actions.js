import {InstanceStatus} from '@companion-module/base'
export function compileActionDefinitions(self) {
	const pad0 = self.pad0

	let actionDefs = {
		route: {
			name: 'Route input to output',
			options: [
				{
					type: 'textinput',
					label: 'Router Input',
					id: 'input',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Router Output',
					id: 'output',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const i = parseInt(await context.parseVariablesInString(action.options.input))
				const o = parseInt(await context.parseVariablesInString(action.options.output))
				const ci = await context.parseVariablesInString('$(this:page)/$(this:row)/$(this:column)')

				const bi = i < 0 || i > self.router.inputs
				const bo = o < 0 || o > self.router.outputs

				if (bi && bo) {
					self.updateStatus(InstanceStatus.BadConfig, `Bad input and output on ${ci}`)
				} else if (bo) {
					self.updateStatus(InstanceStatus.BadConfig, `Bad output on ${ci}`)
				} else if (bi) {
					self.updateStatus(InstanceStatus.BadConfig, `Bad input on ${ci}`)
				}

				if (!(bi || bo)) {
					self.sendCmd(`OS ${pad0(o)} ${pad0(i)}`)
          self.updateStatus(InstanceStatus.Ok)
				}
			},
		},
		recallPreset: {
			name: 'Recall Preset',
			options: [
				{
					type: 'textinput',
					label: 'Recall Preset',
					id: 'recall',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				let p = parseInt(await context.parseVariablesInString(action.options.recall))
				const ci = await context.parseVariablesInString('$(this:page)/$(this:row)/$(this:column)')

				if (p < 1 || p > self.router.outputs) {
					self.updateStatus(InstanceStatus.BadConfig, `Bad preset number on ${ci}`)
				} else {
					const cmd = `PS ${pad0(p)} 00`
					self.sendCmd(cmd)
          self.updateStatus(InstanceStatus.Ok)
				}
			},
		},
		storePreset: {
			name: 'Store Preset',
			options: [
				{
					type: 'textinput',
					label: 'Store Preset',
					id: 'store',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				let p = parseInt(await context.parseVariablesInString(action.options.store))
				const ci = await context.parseVariablesInString('$(this:page)/$(this:row)/$(this:column)')

				if (p < 1 || p > self.router.outputs) {
					self.updateStatus(InstanceStatus.BadConfig, `Bad preset number on ${ci}`)
				} else {
					const cmd = `PC ${pad0(p)} 00`
					self.sendCmd(cmd)
          self.updateStatus(InstanceStatus.Ok)
				}
			},
		},
	}
	return actionDefs
}
