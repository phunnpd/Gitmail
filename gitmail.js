var Imap = require('imap');
var inspect = require('util').inspect;
var sys = require('sys');
var exec = require('child_process').exec;
var fs = require('fs');

// puts is used for executing the command line
function puts(error, stdout, stderr) { sys.puts(stdout) }

var imap = new Imap({
	user: '',
	password: '',
	host: 'imap.yourcompany.com',
	port: 993,
	secure: true
});

var accessToken = '';
var url = 'https://api.github.com/repos/user-name/repo-name/issues?access_token=';

function show(obj) {
	return inspect(obj, false, Infinity);
}

function die(err) {
	console.log('Uh oh: ' + err);
	process.exit(1);
}

imap.connect(function(err) {
	console.log('connecting');
	if (err) die(err);
	imap.openBox('INBOX', false, function(err, box) {
		console.log('\n' + box.name + ' opened');
		console.log('readonly: ' + box.readOnly);
		console.log('permFlags: ' + box.permFlags);
		console.log('messages.total: ' + box.messages.total);
		console.log('messages.new: ' + box.messages.new + '\n');

		searchForNewEmail(); // initial search

		imap.on('mail', function(items, err) {
			console.log('\n' + 'New mail received! Count: ' + items + '\n');
			searchForNewEmail();
		});

		imap.on('msgupdate', function(items, err) {
			console.log('\n' + 'Msg Update!' + '\n');
			searchForNewEmail();
		});
	});
});

function searchForNewEmail() {
	console.log('searching');
	imap.search([ 'UNSEEN', ['SINCE', 'May 20, 2010'] ], function(err, results) {
		console.log('searched');
		if (err) console.log(err);
		try {
			imap.fetch(results, { 	headers: { parse: true },
						body: true,
						cb: function(fetch) {
	
							console.log('fetching');
							fetch.on('message', function(message) {
								console.log('receiving message');
								var body = '';
								var subject = '';

								message.on('headers', function(data) {
									subject = data.subject[0];
									console.log('subject: ' + subject);
								});
								
								message.on('data', function(chunk) {
									body += chunk.toString();
								});
	
								message.on('end', function() {
                                                                        console.log('\n\nISSUE ADDED');
                                                                        console.log('Title: ' + subject);
									console.log('---START CONTENT---');
									console.log(body);
									console.log('---END CONTENT---');
                                                                        console.log('\n');

									var data = {title: subject, body: body};

									fs.writeFile("temp.json", JSON.stringify(data), function(err) {
										if (err) {
											console.log(err);
										} else {
											console.log('Saved JSON to file.');
										}
									});

									exec('curl -i -d @temp.json ' + url + accessToken, puts);
									exec('espeak "noowishoo."', puts); // say "new issue"

									imap.move(message.uid, '[Gmail]/All Mail', function(err) {
                                                                                console.log('Archiving message. Error: ' + err);
                                                                        });

									body = '';
								});
							});
						} // end options
			}, function(err) {
				console.log('\nend fetch. error: ' + err);
			});
		}
		catch (e) {
			// this try/catch block is primarily needed to catch the "Nothing to fetch" error
			// so our program doesn't stop when the inbox is simply empty
			console.log(e);
		}
	});

}
