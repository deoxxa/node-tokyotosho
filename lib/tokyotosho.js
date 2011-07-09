require("datejs");

function tagToText(tag) {
  if (tag.type == "text") {
    return tag.data;
  } else if (tag.children != undefined) {
    return tag.children.map(tagToText).join(" ");
  } else {
    return "";
  }
}

function constructDetailsPath(id) {
  return "/details.php?id="+encodeURIComponent(id);
}

exports.details = function(id, cb) {
  // Get htmlparser object
  var htmlparser = require("htmlparser");
  // Construct handler
  var detail_handler = new htmlparser.DefaultHandler(
    function(err, dom) {
      if (err) {
        cb({message: "Error parsing HTML: "+err.message}, null);
        return;
      }

      // Parse details
      // There's an emulated table kind of thing (I don't know, it's retarded)
      // that has to be parsed in an odd way. Improvements here are welcomed.
      var details = {category: 0, url: null, time: null, comment: null, website: null};
      var current_detail = "";
      require("soupselect").select(detail_handler.dom, "div.details ul li").forEach(function(el) {
        if (el.attribs.class.match(/detailsleft/)) {
          current_detail = tagToText(el).replace(/:/, "");
        }
        if (el.attribs.class.match(/detailsright/)) {
          if (current_detail == "Torrent Type" && el.children != undefined && el.children[0].attribs != undefined && el.children[0].attribs.href != undefined) {
            details["category"] = el.children[0].attribs.href.replace(/^[^0-9]+/, "");
          } else if (current_detail == "Torrent Name" && el.children != undefined && el.children[0].attribs != undefined && el.children[0].attribs.href != undefined) {
            details["title"] = require("ent").decode(tagToText(el));
            details["url"] = require("ent").decode(el.children[0].attribs.href);
          } else if (current_detail == "Date Submitted") {
            details["time"] = Date.parse(tagToText(el));
          } else if (current_detail == "Comment") {
            var comment = require("ent").decode(tagToText(el));
            if (comment != "N/A") { details["comment"] = comment; }
          } else if (current_detail == "Website" && el.children != undefined && el.children[0].attribs != undefined && el.children[0].attribs.href != undefined) {
            details["website"] = require("ent").decode(el.children[0].attribs.href);
          }
        }
      });

      cb(null, details);
    },
    {ignoreWhitespace: true, verbose: false}
  );
  // Construct parser
  var detail_parser  = new htmlparser.Parser(detail_handler);

  // Make request
  require("http").get({host: "www.tokyotosho.info", port: 80, path: "/details.php?id="+id}, function(res) {
    if (res.statusCode != 200) {
      cb({message: "Error retrieving page, expected 200 status code but got "+res.statusCode}, null);
      return;
    }

    var body = "";
    res.on("data", function(chunk) { body += chunk; });
    res.on("end", function() {
      // Parse HTML
      detail_parser.parseComplete(body);
    });
  });
}

function constructSearchPath(options) {
  if (options.terms == undefined || options.terms == "") { return "/"; }
  var url = "/search.php?";
  parameters = [];
  for (var k in options) { parameters.push(k+"="+encodeURIComponent(options[k])); }
  url += parameters.join("&");
  return url;
}

exports.search = function(options, cb) {
  if (cb == undefined) { cb = options; options = null; }
  if (options == null || options == undefined || !options) { options = {}; }

  if (options.terms == undefined)    { options.terms = "";    }
  if (options.type == undefined)     { options.type = 0;      }
  if (options.size_min == undefined) { options.size_min = ""; }
  if (options.size_max == undefined) { options.size_max = ""; }
  if (options.username == undefined) { options.username = ""; }

  var htmlparser = require("htmlparser");
  // Construct handler
  var search_handler = new htmlparser.DefaultHandler(
    function(err, dom) {
      if (err) {
        cb({message: "Error parsing HTML: "+err.message}, null);
      }

      // Get entry IDs
      var ids = [];
      require("soupselect").select(search_handler.dom, "table.listing tr td.web a").forEach(function(link) {
        if (link.attribs.href.match(/details.php/)) {
          ids.push(link.attribs.href.replace(/^[^0-9]+/, ""));
        }
      });

      cb(null, ids);
    },
    {ignoreWhitespace: true, verbose: false}
  );
  // Construct parser
  var search_parser  = new htmlparser.Parser(search_handler);

  require("http").get({host: "www.tokyotosho.info", port: 80, path: constructSearchPath(options)}, function(res) {
    var body = "";
    res.on("data", function(chunk) { body += chunk; });
    res.on("end", function() {
      // Parse HTML
      search_parser.parseComplete(body);
    });
  });
}
