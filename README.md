Tokyo Toshokan for Node.JS
==========================

About
-----

This is a simple wrapper for searching and retrieving details from Tokyo
Toshokan, an online torrent index. It's not designed to be a fully featured
client, but rather an easy way to automate searching the main content of the
site.

There are probably a bunch of error conditions that aren't handled right now,
but I'll be sorting them out as they come up. Feel free to report any I don't
find to me directly via github or some such mechanism.

Usage
-----

    #!/usr/bin/env node
    
    var tokyotosho = require("tokyotosho");
    var tt = new tokyotosho.Client("www.tokyotosho.info", 80, "/");
    
    tt.search({terms: "rozen maiden"}, function(err, results) {
      if (err) {
        console.warn("[-] Error performing search: " + err.message);
        return;
      }
    
      results.forEach(function(result) {
        tt.details(result.id, function(err, entry) {
          if (err) {
            console.warn("[-] Error fetching details for entry: " + err.message);
            return;
          }
    
          console.log("Entry " + entry.id + ": " + JSON.stringify(entry));
        });
      });
    });

Details
-------

The `search` method takes two arguments: an options object and a callback in the
form of `function(error, results)`. The `options` object can contain the fields
`terms`, `category`, `size_min`, `size_max` (measured in MiB) and `username`,
which refers to the submitter's username. In the callback, `error` will contain
a `message` parameter that can be used to glean additional error information.
`results` is an array of entries, the fields of which are `id`, `title`, `url`,
`category`, `time`,`size`, `submitter`, `comment`, `website` and if present on
the page, `authorized`.

The `details` method takes two arguments as well, an ID and a callback in the
form of `function(error, entry)`. `error` behaves similarly to the `error`
object returned by  `search`. `entry` is an object with the fields `id`, `time`,
`category`, `url`, `comment` and `website`.

Fields
------

`id`: the ID assigned to the entry by Tokyo Toshokan.  
`title`: the name of the torrent.  
`url` is the URL of the torrent itself.  
`category`: an object containing two parameters: `id` and `name`, where `id` is
the numeric ID to be used in search queries and `name` is the human readable
name of the category.  
`time`: the time the torrent was uploaded (only accurate to within the minute).  
`size`: the size of the torrent (this is a text field right now)  
`submitter`: the username of the submitter of the torrent  
`website`: the website supplied at submission time, a (right now unvalidated)
URL  
`comment`: the comment supplied at submission time, free text  
`authorized`: a boolean value if present or null if not  

U mad?
------

I can be contacted via email, github or a couple of different IRC networks. I
frequent some channels on rizon and freenode primarily, and if I'm not playing
silly games with my nick, you'll be able to find me there as "deoxxa".
