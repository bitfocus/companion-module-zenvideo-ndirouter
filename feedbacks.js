import { combineRgb } from '@companion-module/base'

export function GetFeedbackDefinitions(self) {
	const ON_OFF = [
		{ id: true, label: 'On' },
		{ id: false, label: 'Off' },
	]

	const YES_NO = [
		{ id: true, label: 'Yes' },
		{ id: false, label: 'No' },
	]
	return {
		inp_ok: {
			type: 'boolean',
			name: 'Input Valid',
			description: 'Change button state when Input is valid',
			defaultStyle: {
				bgcolor: combineRgb(0, 128, 0),
				color: 16777215,
			},
			options: [
				{
					type: 'number',
					label: 'Which Input?',
					id: 'inp_num',
					default: 1,
					min: 1,
					max: self.MAX_INPUTS,
				},
				{
					type: 'dropdown',
					label: 'Is Valid?',
					id: 'is_valid',
					default: true,
					choices: YES_NO,
				},
			],
			callback: (fb) => {
				return self.router.inp[fb.options.inp_num - 1].valid == fb.options.is_valid
			},
		},
		inp_use: {
			type: 'boolean',
			name: 'Input In Use',
			description: 'Change button state when Input is routed to any Output',
			defaultStyle: {
				bgcolor: combineRgb(128, 0, 0),
				color: 16777215,
			},
			options: [
				{
					type: 'number',
					label: 'Which Input?',
					id: 'inp_num',
					default: 1,
					min: 1,
					max: self.MAX_INPUTS,
				},
				{
					type: 'dropdown',
					label: 'In use?',
					id: 'in_use',
					default: true,
					choices: YES_NO,
				},
			],
			callback: (fb) => {
				return self.router.inp[fb.options.inp_num - 1].outs.size > 0 == fb.options.in_use
			},
		},
		routed: {
			type: 'boolean',
			name: 'Routed',
			description: 'Change button style if Input is routed to Output',
			defaultStyle: {
				bgcolor: combineRgb(0, 128, 0),
				color: 16777215,
			},
			options: [
				{
					type: 'textinput',
					label: 'Input',
					id: 'source',
					default: 1,
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Output',
					id: 'dest',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (fb, context) => {
				const opt = fb.options
				const i = parseInt(await context.parseVariablesInString(opt.source))
				const o = parseInt(await context.parseVariablesInString(opt.dest))

				if (i > 0 && i <= self.router.inputs && o > 0 && o <= self.router.outputs) {
					return self.router.out[o - 1].inp == i
				} else {
					self.log('warn', 'Option out of range ' + fb.controlId)
				}
			},
		},
		pre_ok: {
			type: 'boolean',
			name: 'Preset Valid',
			description: 'Change button state when Preset is Valid',
			defaultStyle: {
				bgcolor: combineRgb(64, 64, 0),
				color: 16777215,
			},
			options: [
				{
					type: 'number',
					label: 'Which preset?',
					id: 'pre_num',
					default: 1,
					min: 1,
					max: self.MAX_INPUTS,
				},
				{
					type: 'dropdown',
					label: 'Is Valid',
					id: 'is_valid',
					default: true,
					choices: YES_NO,
				},
			],
			callback: (fb) => {
				return self.router.pre[fb.options.pre_num - 1].valid == fb.options.is_valid
			},
		},
		pre_use: {
			type: 'boolean',
			name: 'Preset In Use',
			description: 'Change button state when Preset is Active',
			defaultStyle: {
				bgcolor: combineRgb(128, 0, 0),
				color: 16777215,
			},
			options: [
				{
					type: 'number',
					label: 'Which Preset?',
					id: 'pre_num',
					default: 1,
					min: 1,
					max: self.MAX_INPUTS,
				},
				{
					type: 'dropdown',
					label: 'Active?',
					id: 'active',
					default: true,
					choices: YES_NO,
				},
			],
			callback: (fb) => {
				return self.router.pre[fb.options.pre_num - 1].active == fb.options.active
			},
		},
	}
}
