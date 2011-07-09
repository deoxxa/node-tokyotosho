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
    
    tokyotosho.search({terms: "rozen maiden"}, function(err, ids) {
      if (err) {
        console.warn("[-] Error performing search: " + err.message);
        return;
      }
    
      ids.forEach(function(id) {
        tokyotosho.details(id, function(err, entry) {
          if (err) {
            console.warn("[-] Error fetching details for entry: " + err.message);
            return;
          }
    
          console.log(JSON.stringify(entry));
        });
      });
    });

U mad?
------

I can be contacted via email, github or a couple of different IRC networks. I
frequent some channels on rizon and freenode primarily, and if I'm not playing
silly games with my nick, you'll be able to find me there as "deoxxa".
