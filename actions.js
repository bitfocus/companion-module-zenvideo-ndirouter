export function compileActionDefinitions(self) {
	const pad0 = self.pad0

	let actionDefs = {
		'route': {
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
				const ci = action.controlId

				const bi = i < 0 || i > self.MAX_INPUTS
				const bo = o < 0 || o > self.MAX_OUTPUTS

				if (bi && bo) {
					self.updateStatus(InstanceStatus.BadConfig, `Bad input and output on ${ci}`)
				} else if (bo) {
					self.updateStatus(InstanceStatus.BadConfig, `Bad output on ${ci}`)
				} else if (bi) {
					self.updateStatus(InstanceStatus.BadConfig, `Bad input on ${ci}`)
				}

				if (!(bi || bo)) {
					self.sendCmd(`OS ${pad0(o)} ${pad0(i)}`)
				}
			},
		},
		'recallPreset': {
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

				if (p < 1 || p > self.MAX_OUTPUTS) {
					self.updateStatus(InstanceStatus.BadConfig, 'Bad preset on ' + action.controlId)
				} else {
					const cmd = `PS ${pad0(p)} 00`
					self.sendCmd(cmd)
				}
			},
		},
		'storePreset': {
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

				if (p < 1 || p > self.MAX_OUTPUTS) {
					self.updateStatus(InstanceStatus.BadConfig, 'Bad preset on ' + action.controlId)
				} else {
					const cmd = `PC ${pad0(p)} 00`
					self.sendCmd(cmd)
				}
			},
		},
	}
	return actionDefs
}
