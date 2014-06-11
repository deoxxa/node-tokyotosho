require("datejs");

function tagToText(tag) {
  if (tag.type == "text") {
    return tag.data.replace(/^\s*(.+?)\s*$/, '$1');
  } else if (tag.children != undefined) {
    return tag.children.map(tagToText).join(" ");
  } else {
    return "";
  }
}

var Client = function(host, port, path) {
  this.host = host;
  this.port = port;
  this.path = path;
}

Client.prototype.constructDetailsPath = function(id) {
  return this.path + "details.php?id="+encodeURIComponent(id);
}

Client.prototype.details = function(id, cb) {
  // Get htmlparser object
  var htmlparser = require("htmlparser");
  // Construct handler
  var details_handler = new htmlparser.DefaultHandler(
    function(err, dom) {
      if (err) {
        cb({message: "Error parsing HTML: "+err.message}, null);
        return;
      }

      require("soupselect").select(details_handler.dom, "p").forEach(function(el) {
        var text = tagToText(el);
        if (text.match(/Entry not found/)) { err = {message: "Entry not found"}; }
        if (text.match(/Entry deleted/)) { err = {message: "Entry deleted"}; }
        if (text.match(/Entry hidden/)) { err = {message: "Entry hidden"}; }
      });

      if (err) {
        cb({message: "TokyoTosho error: "+err.message}, null);
        return;
      }

      // Parse details
      // There's an emulated table kind of thing (I don't know, it's retarded)
      // that has to be parsed in an odd way. Improvements here are welcomed.
      var details = {id: null, title: null, category: null, url: null, time: null, comment: null, website: null, submitter: null, info_hash: null};
      var current_detail = "";
      require("soupselect").select(details_handler.dom, "div.details ul li").forEach(function(el) {
        if (el.attribs.class.match(/detailsleft/)) {
          current_detail = tagToText(el).replace(/:/, "");
        }
        if (el.attribs.class.match(/detailsright/)) {
          if (current_detail == "Torrent Number") {
            details.id = tagToText(el);
          } else if (current_detail == "Torrent Type" && el.children != undefined && el.children[0].attribs != undefined && el.children[0].attribs.href != undefined) {
            details.category = {id: el.children[0].attribs.href.replace(/^[^0-9]+/, ""), title: tagToText(el.children[0])};
          } else if (current_detail == "Torrent Name" && el.children != undefined && el.children[0].attribs != undefined && el.children[0].attribs.href != undefined) {
            details.title = require("he").decode(tagToText(el));
            details.url = require("he").decode(el.children[0].attribs.href);
          } else if (current_detail == "Date Submitted") {
            details.time = Date.parse(tagToText(el));
          } else if (current_detail == "Comment") {
            var comment = require("he").decode(tagToText(el));
            if (comment != "N/A") { details.comment = comment; }
          } else if (current_detail == "Website" && el.children != undefined && el.children[0].attribs != undefined && el.children[0].attribs.href != undefined) {
            details.website = require("he").decode(el.children[0].attribs.href);
          } else if (current_detail == "Submitter" && el.children != undefined) {
            details.submitter = require("he").decode(tagToText(el.children[0]));
          } else if (current_detail == "BT Info Hash (SHA)" && el.children != undefined) {
            details.info_hash = require("he").decode(tagToText(el.children[1]));
          }
        }
      });

      cb(null, details);
    },
    {ignoreWhitespace: true, verbose: false}
  );
  // Construct parser
  var details_parser  = new htmlparser.Parser(details_handler);

  // Make request
  require("http").get({host: this.host, port: this.port, path: this.constructDetailsPath(id)}, function(res) {
    if (res.statusCode != 200) {
      cb({message: "Error retrieving page, expected 200 status code but got "+res.statusCode}, null);
      return;
    }

    var body = "";
    res.on("data", function(chunk) { body += chunk; });
    res.on("end", function() {
      // Parse HTML
      details_parser.parseComplete(body);
    });
  });
}

Client.prototype.constructSearchPath = function(options) {
  if (options.terms == undefined || options.terms == "") { return "/"; }
  parameters = [];
  for (var k in options) { parameters.push(k+"="+encodeURIComponent(options[k])); }
  return this.path + "search.php?" + parameters.join("&");
}

Client.prototype.search = function(options, cb) {
  if (cb == undefined) { cb = options; options = null; }
  if (options == null || options == undefined || !options) { options = {}; }

  var htmlparser = require("htmlparser");
  // Construct handler
  var search_handler = new htmlparser.DefaultHandler(
    function(err, dom) {
      if (err) {
        cb({message: "Error parsing HTML: "+err.message}, null);
      }

      // Get results
      var results = [];
      var result = null;
      var result_row = 0;
      require("soupselect").select(search_handler.dom, "table.listing tr").forEach(function(row) {
        if (row != undefined && row.children != undefined && row.children.length >= 3 && row.children[2].attribs != undefined && row.children[2].attribs.class != undefined && row.children[2].attribs.class.match(/web/)) {
          result_row = 1;
        }

        if (result_row == 1) {
          result = {id: null, title: null, url: null, category: {id: null, title: null}, time: null, size: null, submitter: null, website: null, comment: null};
          row.children[2].children.forEach(function(link) {
            var text = tagToText(link);
            if (text == "Website")
              result.website = require("he").decode(link.attribs.href);
            if (text == "Details")
              result.id = link.attribs.href.replace(/^.+?([0-9]+)$/, '$1');
          });
          result.title = require("he").decode(tagToText(row.children[1].children[0]));
          result.url = require("he").decode(row.children[1].children[0].attribs.href);
          result.category = {id: row.children[0].children[0].attribs.href.replace(/^[^0-9]+/, ''), title: row.children[0].children[0].children[0].attribs.alt};
          result_row = 2;
        } else if (result_row == 2) {
          var text = tagToText(row.children[0]).replace(/Authorized: (yes|no)/, "Authorized: $1 | ");
          text.split(/\|/, 4).forEach(function(chunk) {
            var sides = chunk.replace(/^\s*(.+?)\s*$/, '$1').split(/: /, 2);
            if (sides[0] == "Authorized")
              result.authorized = (sides[1] == "yes");
            if (sides[0] == "Submitter")
              result.submitter = require("he").decode(sides[1]);
            if (sides[0] == "Size")
              result.size = sides[1];
            if (sides[0] == "Date")
              result.time = Date.parse(require("he").decode(sides[1]));
            if (sides[0] == "Comment")
              result.comment = require("he").decode(sides[1]);
          });
          results.push(result);
          result = null;
          result_row = 0;
        }
      });

      cb(null, results);
    },
    {ignoreWhitespace: true, verbose: false}
  );
  // Construct parser
  var search_parser  = new htmlparser.Parser(search_handler);

  require("http").get({host: this.host, port: this.port, path: this.constructSearchPath(options)}, function(res) {
    var body = "";
    res.on("data", function(chunk) { body += chunk; });
    res.on("end", function() {
      // Parse HTML
      search_parser.parseComplete(body);
    });
  });
}

exports.Client = Client;
