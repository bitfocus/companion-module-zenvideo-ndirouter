var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;


function instance(system, id, config) {
	var self = this;

	// Request id counter
	self.request_id = 0;
	self.login = false;
	// super-constructor
	instance_skel.apply(this, arguments);
	self.status(1,'Instance Initializing');
	self.actions(); // export actions
	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;
	self.config = config;
	self.init_tcp();
};


instance.prototype.incomingData = function(data) {
	var self = this;
	debug(data);

	// Match part of the copyright response from unit when a connection is made.
	// Send Info request which should reply with Config "CR 06 02"
	if (self.login === false && data.match("Connected To ZEN NDIRouter")) {
		self.status(self.STATUS_WARNING,'Logging in');
		self.socket.write("CR xx yy"+ "\r");
	}

	// Match first letter of expected response from unit.
	else if (self.login === false && data.match("CR")) {
		self.login = true;
		self.status(self.STATUS_OK);
		debug("logged in");
	}
	else {
		debug("data nologin", data);
	}
};


instance.prototype.init = function() {
	var self = this;
	debug = self.debug;
	log = self.log;
	self.init_tcp();
};

instance.prototype.init_tcp = function() {
	var self = this;
	var receivebuffer = '';

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
		self.login = false;
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, 9779);

		self.socket.on('status_change', function (status, message) {
			if (status !== self.STATUS_OK) {
				self.status(status, message);
			}
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.log('error',"Network error: " + err.message);
		});

		self.socket.on('connect', function () {
			debug("Connected");
			self.login = false;
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.log('error',"Network error: " + err.message);
			self.login = false;
		});
		// if we get any data, display it to stdout
		self.socket.on("data", function(buffer) {
			var indata = buffer.toString("utf8");
			self.incomingData(indata);
		});
	}
};


// Fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module is for the Zen NDI Router'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'ZEN IP address',
			width: 12,
			default: '192.168.1.1',
			regex: self.REGEX_IP
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function () {
		var self = this;

		if (self.socket !== undefined) {
			self.socket.destroy();
		}
		debug("destroy", self.id);
};


instance.prototype.actions = function (system) {
	var self = this;
	var actions = {
		'route': {
			label: 'Route input to output',
			options: [{
					type: 'textinput',
					label: 'input',
					id: 'input',
					regex: self.REGEX_NUMBER
			}, {
				type: 'textinput',
				label: 'output',
				id: 'output',
				regex: self.REGEX_NUMBER
			}]
		},
		'recallPreset': {
			label: 'Recall Preset',
			options: [{
					type: 'textinput',
					label: 'preset',
					id: 'preset',
					regex: self.REGEX_NUMBER
			}]
		}
	};

	self.setActions(actions);
};


instance.prototype.action = function (action) {
	var self = this;
	var id = action.action;
	var opt = action.options;
	var cmd;

	switch (id) {
		case 'route':
			cmd = "OS\x20" + opt.output +"\x20"+ opt.input;
			break;
		case 'recallPreset':
			cmd = "PS\x20" + opt.preset +"   ";
			break;
		}

	if (cmd !== undefined) {
			if (self.tcp !== undefined) {
					debug('sending ', cmd, "to", self.tcp.host);
					self.tcp.send(cmd);
			}
	}

	if (cmd !== undefined) {
		if (self.socket !== undefined && self.socket.connected) {
			self.socket.write(cmd+"\r");
		} else {
			debug('Socket not connected :(');
		}
	}
};


instance_skel.extendedBy(instance);
exports = module.exports = instance;
