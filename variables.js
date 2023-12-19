export function GetVariableDefinitions(self) {
	let variables = []

	variables.push({
		name: 'Name',
		variableId: 'name',
	})
	variables.push({
		name: 'Number',
		variableId: 'number',
	})
	variables.push({
		name: 'Max Inputs',
		variableId: 'n_ins',
	})
	variables.push({
		name: 'Max Outputs',
		variableId: 'n_outs',
	})
	variables.push({
		name: 'Current Preset',
		variableId: 'preset',
	})
	for (let i = 1; i <= self.MAX_INPUTS; i++) {
		const i0 = self.pad0(i)
		variables.push({
			name: `Input ${i0} Device Name`,
			variableId: `i_${i0}_n`,
		})
		variables.push({
			name: `Input ${i0} Network Name`,
			variableId: `i_${i0}_t`,
		})
		variables.push({
			name: `Input ${i0} is valid`,
			variableId: `i_${i0}_v`,
		})
		variables.push({
			name: `Input ${i0} in use`,
			variableId: `i_${i0}_u`,
		})
	}
	for (let o = 1; o <= self.MAX_OUTPUTS; o++) {
		const o0 = self.pad0(o)
		variables.push({
			name: `Output ${o0} name`,
			variableId: `o_${o0}_n`,
		})
		variables.push({
			name: `Output ${o0} source`,
			variableId: `o_${o0}_s`,
		})
		variables.push({
			name: `Preset ${o0} name`,
			variableId: `p_${o0}_n`,
		})
		variables.push({
			name: `Preset ${o0} is valid`,
			variableId: `p_${o0}_v`,
		})
		variables.push({
			name: `Preset ${o0} in use`,
			variableId: `p_${o0}_u`,
		})
	}
	return variables
}
