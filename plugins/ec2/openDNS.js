var AWS = require('aws-sdk');
var async = require('async');
var helpers = require('../../helpers');

module.exports = {
	title: 'Open DNS',
	category: 'EC2',
	description: 'Determine if TCP or UDP port 53 for DNS is open to the public',
	more_info: 'While some ports such as HTTP and HTTPS are required to be open to the public to function properly, more sensitive services such as DNS should be restricted to known IP addresses.',
	link: 'http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/authorizing-access-to-an-instance.html',
	recommended_action: 'Restrict TCP and UDP port 53 to known IP addresses',

	run: function(AWSConfig, callback) {
		var results = [];

		async.each(helpers.regions.ec2, function(region, rcb){
			AWSConfig.region = region;
			var ec2 = new AWS.EC2(AWSConfig);

			// Get the account attributes
			helpers.cache(ec2, 'describeSecurityGroups', function(err, data) {
				if (err || !data || !data.SecurityGroups) {
					results.push({
						status: 3,
						message: 'Unable to query for security groups',
						region: region
					});

					return rcb();
				}

				if (!data.SecurityGroups.length) {
					results.push({
						status: 0,
						message: 'No security groups present',
						region: region
					});

					return rcb();
				}

				for (i in data.SecurityGroups) {
					for (j in data.SecurityGroups[i].IpPermissions) {
						var permission = data.SecurityGroups[i].IpPermissions[j];

						for (k in permission.IpRanges) {
							var range = permission.IpRanges[k];

							if (range.CidrIp === '0.0.0.0/0') {
								if ( (permission.IpProtocol === 'tcp' || permission.IpProtocol === 'udp') && permission.FromPort <= 53 && permission.ToPort >= 53) {
									results.push({
										status: 2,
										message: 'Security group: ' + data.SecurityGroups[i].GroupId + ' (' + data.SecurityGroups[i].GroupName + ') has DNS TCP and/or UDP port 53 open to 0.0.0.0/0',
										region: region,
										resource: data.SecurityGroups[i].GroupId
									});
								}
							}
						}
					}
				}

				if (!results.length) {
					results.push({
						status: 0,
						message: 'No public open ports found',
						region: region
					});
				}

				rcb();
			});
		}, function(){
			callback(null, results);
		});
	}
};
