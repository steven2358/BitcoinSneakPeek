// Bitcoin Sneak Peek: Instantly see the balance of a 
// Bitcoin and Dogecoin address mentioned on any web page.
//
// Copyright (c) 2014 Steven Van Vaerenbergh
//
// URL: https://github.com/steven2358/BitcoinSneakPeek
//
// Licensed under the MIT license:
//	http://www.opensource.org/licenses/mit-license.php

/**
 * Walk through the DOM tree and process all text nodes.
 * From http://stackoverflow.com/a/5904945/1221212
 **/
function walk(node) {
  var child, next;
  switch (node.nodeType) {
    case 1:  // Element
    case 9:  // Document
    case 11: // Document fragment
      child = node.firstChild;
      while (child) {
        next = child.nextSibling;
        walk(child);
        child = next;
      }
      break;
    case 3: // Text node
      processTextNode(node);
      break;
  }
}

/**
 * Check if DOM text node is a link.
 * From http://stackoverflow.com/a/5540610
 **/
function nodeInLink(textNode) {
  var curNode = textNode;
  while (curNode) {
    if (curNode.tagName == 'A')
	  return true;
    else
	  curNode = curNode.parentNode;
	}
  return false;
}

/**
 * Apply an addEventListener to each element of a node list.
 * From http://stackoverflow.com/a/12362466
 **/
function addEventListenerByClass(className, event, fn) {
    var list = document.getElementsByClassName(className);
    for (var i = 0, len = list.length; i < len; i++) {
        list[i].addEventListener(event, fn, false);
    }
}
/**
 * Insert a span inside a text node.
 * From http://stackoverflow.com/a/374187
 **/
function insertSpanInTextNode(textNode,spanKey,spanClass,at) {
  // create new span node
  var span = document.createElement("span");
  span.setAttribute('key',spanKey);
  span.className = spanClass;
  var textHolderDiv = document.createElement("div");
  var textNodeParent = textNode.parentNode;
  textHolderDiv.setAttribute('style', 'width:auto;white-space: nowrap;display:none;color:black;z-index:9999;margin-left:1em;margin-top:-1.2em;border:solid 1px #BEBEBE;background:#FAFAFA;position:absolute;-moz-border-radius:5px;border-radius:5px;');
  textHolderDiv.appendChild(document.createTextNode(''));
  span.appendChild( textHolderDiv );

  // split the text node into two and add new span
  textNode.parentNode.insertBefore(span, textNode.splitText(at));
}

/**
 * Insert a span inside after the parent node that represents a link.
 **/
function insertSpanAfterLink(textNode,spanKey,spanClass) {
  var curNode = textNode;
  while (curNode) {
    if (curNode.tagName == 'A') {
      // create new span node
      var span = document.createElement("span");
      span.setAttribute('key',spanKey);
	  span.className = spanClass;
      span.appendChild(document.createTextNode(''));
	  var textHolderDiv = document.createElement("div");
	  textHolderDiv.setAttribute('style', 'width:auto;white-space: nowrap;color:black;z-index:9999;display:none;margin-left:1em;margin-top:-1.2em;border:solid 1px #BEBEBE;background:#FAFAFA;position:absolute;-moz-border-radius:5px;border-radius:5px;');
	  textHolderDiv.appendChild(document.createTextNode(''));
	  span.appendChild(textHolderDiv);
	  // add the span after the link
	  curNode.parentNode.insertBefore(span,curNode.nextSibling);
	  return true;
	}
    else {
	  curNode = curNode.parentNode;
	}
  }
}

/**
 * Load data from blockchain.info and write to span.
 **/
function loadData(node,publicKey) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			var status = xhr.status;
			if (status == 200) {
				var myReceived = parseInt(xhr.response.total_received)/100000000;
				var myBalance = parseInt(xhr.response.final_balance)/100000000;
				node.innerHTML = 'Balance: '+ myBalance + ' BTC. Received: '+ myReceived + ' BTC. <a href="https://blockchain.info/address/'+ publicKey +'" target="_blank">Blockchain</a>';
			} else {
				node.innerHTML = '<a href="https://blockchain.info/address/'+ publicKey +'" target="_blank">Blockchain</a> info not available.';
				console.log('Blockchain info not available. Error '+status+'.');
				loadBlockExplorerData(node,publicKey);
			}
		}
	}
	var url = 'https://blockchain.info/rawaddr/'+publicKey+'?limit=0'
	node.innerHTML = 'Loading...';
	
	xhr.open("GET", url, true);
	xhr.responseType = 'json';
	xhr.send();
}

/**
 * Load data from blockexplorer.com.
 **/
function loadBlockExplorerData(node,publicKey) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			var status = xhr.status;
			if (status == 200) {
				var myBalance = xhr.response;
				loadBlockExplorerReceived(node,publicKey,myBalance);
			} else {
				node.innerHTML = '<a href="https://blockexplorer.com/address/'+ publicKey +'" target="_blank">BlockExplorer</a> not available.';
				console.log('BlockExplorer not available. Error '+status+'.');
			}
		}
	}
	var url = 'https://blockexplorer.com/q/addressbalance/'+publicKey;
	
	xhr.open("GET", url, true);
	xhr.send();
}

/**
 * Load data from dogechain.info.
 **/
function loadDogeChainData(node,publicKey) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			var status = xhr.status;
			if (status == 200) {
				var myBalance = xhr.response;
				loadDogechainReceived(node,publicKey,myBalance);
			} else {
				node.innerHTML = '<a href="https://dogechain.info/address/'+ publicKey +'" target="_blank">Dogechain</a> not available.';
				console.log('Dogechain not available. Error '+status+'.');
			}
		}
	}
	var url = 'https://dogechain.info/chain/Dogecoin/q/addressbalance/'+publicKey;
	
	xhr.open("GET", url, true);
	xhr.send();
}

/**
 * Load received amount from blockexplorer.com and write to span.
 **/
function loadBlockExplorerReceived(node,publicKey,myBalance) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			var status = xhr.status;
			if (status == 200) {
				var myReceived = xhr.response;
				node.innerHTML = 'Balance: '+ myBalance + ' BTC. Received: '+ myReceived + ' BTC. <a href="https://blockexplorer.com/address/'+ publicKey +'" target="_blank">BlockExplorer</a>';
			} else {
				node.innerHTML = '<a href="https://blockexplorer.com/address/'+ publicKey +'" target="_blank">BlockExplorer</a> not available.';
				console.log('BlockExplorer not available. Error '+status+'.');
			}
		}
	}
	var url = 'https://blockexplorer.com/q/getreceivedbyaddress/'+publicKey;
	
	xhr.open("GET", url, true);
	xhr.send();
}

/**
 * Load received amount from  dogechain.info. and write to span.
 **/
function loadDogechainReceived(node,publicKey,myBalance) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			var status = xhr.status;
			if (status == 200) {
				var myReceived = xhr.response;
				node.innerHTML = 'Balance: '+ myBalance + ' DOGE. Received: '+ myReceived + ' DOGE. <a href="https://dogechain.info/address/'+ publicKey +'" target="_blank">Dogechain</a>';
			} else {
				node.innerHTML = '<a href="https://dogechain.info/address/'+ publicKey +'" target="_blank">Dogechain</a> not available.';
				console.log('BlockExplorer not available. Error '+status+'.');
			}
		}
	}
	var url = 'https://dogechain.info/chain/Dogecoin/q/getreceivedbyaddress/'+publicKey;
	
	xhr.open("GET", url, true);
	xhr.send();
}

/**
 * Action to perform when clicking on icon.
 **/
function bbToggle(){
  var prevElem = this.previousElementSibling;
  if (prevElem.innerHTML == ''){
    prevElem.style.display = 'inline';
    var publicKey = this.parentNode.getAttribute('key');
    loadData(prevElem,publicKey);
  }
  else {
    if (prevElem.style.display == 'none') {
      prevElem.style.display = 'inline';
    } else {
      prevElem.style.display = 'none';
    }
  }
}

function dcToggle(){
  var prevElem = this.previousElementSibling;
  if (prevElem.innerHTML == ''){
    prevElem.style.display = 'inline';
    var publicKey = this.parentNode.getAttribute('key');
    loadDogeChainData(prevElem,publicKey);
  }
  else {
    if (prevElem.style.display == 'none') {
      prevElem.style.display = 'inline';
    } else {
      prevElem.style.display = 'none';
    }
  }
}

/**
 * Add an image and an empty span to bbHolder span.
 **/
function addHolderContent() {
  var list = document.getElementsByClassName('bbHolder');
  for (var i = 0, len = list.length; i < len; i++) {

    var img = document.createElement("img");
	img.src = chrome.extension.getURL("i/bitcoinsneakpeak32.png");
	img.className = 'bitcoinBalanceIcon';
	img.setAttribute('title','Bitcoin Sneak Peek');
	img.setAttribute('alt','Bitcoin Sneak Peek');
	img.style.cssText = 'height:1em;vertical-align:-10%;cursor:pointer;margin-left:.5em;display:inline;';
	list[i].appendChild(img);
	
    var span = document.createElement("span");
	span.style.cssText = 'margin:0 0 0 .3em;display:none';
    span.appendChild(document.createTextNode(''));
    list[i].appendChild(span);
  }
  // doge
	var list = document.getElementsByClassName('dcHolder');
  for (var i = 0, len = list.length; i < len; i++) {

    var img = document.createElement("img");
	img.src = chrome.extension.getURL("i/dogecoinsneakpeak32.png");
	img.className = 'dogecoinBalanceIcon';
	img.setAttribute('title','Dogecoin Sneak Peek');
	img.setAttribute('alt','Dogecoin Sneak Peek');
	img.style.cssText = 'height:1em;vertical-align:-10%;cursor:pointer;margin-left:.5em;display:inline;';
	list[i].appendChild(img);
	
    var span = document.createElement("span");
	span.style.cssText = 'margin:0 0 0 .3em;display:none';
    span.appendChild(document.createTextNode(''));
    list[i].appendChild(span);
  }
}

/**
 * Add code to DOM nodes.
 **/
function processTextNode(textNode) 
{
	/**
	* Case 1: no address in text -> do nothing
	* Case 2: one or more addresses in text, not part of link -> place span after each address
	* Case 3: one address in text, part of link -> place span after link node
	**/
	
	var re = /\b[13][1-9A-HJ-NP-Za-km-z]{26,33}\b/g
	//From http://www.reddit.com/r/dogecoindev/comments/1y60ov/regular_expression_to_check_if_wallet_adress_is/
	var doge_re = /\b[D]{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}\b/g;
	var val = textNode.nodeValue;
	
	if (re.test(val)) { // exclude case 1
	  if (nodeInLink(textNode)) { // case 3
	    var publicKeys = val.match(re);
		var publicKey = publicKeys[0];
		
		insertSpanAfterLink(textNode,publicKey,'bbHolder');	
	  }
	  else { // case 2
		var myRe = /\b[13][1-9A-HJ-NP-Za-km-z]{26,33}\b/g;
		
		// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
		var myArray;
		var prev = 0;
		var counter = 0;
		var curNode = textNode;
		while ((myArray = myRe.exec(val)) !== null)
		{
		  insertSpanInTextNode(curNode,myArray[0],'bbHolder',myRe.lastIndex-prev);		  
		  prev = myRe.lastIndex;
		  counter = counter + 1;
		  curNode = textNode.parentNode.childNodes[2*counter];
		}
	  }
	}// find the doge
	else if( doge_re.test(val)) { // exclude case 1
	  if (nodeInLink(textNode)) { // case 3
	    var publicKeys = val.match(doge_re);
		var publicKey = publicKeys[0];
		
		insertSpanAfterLink(textNode,publicKey,'dcHolder');	
	  }
	  else { // case 2
		var myRe = /\b[D]{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}\b/g;
		
		// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
		var myArray;
		var prev = 0;
		var counter = 0;
		var curNode = textNode;
		while ((myArray = myRe.exec(val)) !== null)
		{
		  insertSpanInTextNode(curNode,myArray[0],'dcHolder',myRe.lastIndex-prev);		  
		  prev = myRe.lastIndex;
		  counter = counter + 1;
		  curNode = textNode.parentNode.childNodes[2*counter];
		}
	  }
	}
}

walk(document.body);
addHolderContent();
addEventListenerByClass('bitcoinBalanceIcon', 'click', bbToggle); 
addEventListenerByClass('dogecoinBalanceIcon', 'click', dcToggle); 
