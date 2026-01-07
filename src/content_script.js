// Bitcoin Sneak Peek: Instantly see the balance of a
// Bitcoin address mentioned on any web page.
// https://github.com/steven2358/BitcoinSneakPeek
//
// Copyright (c) 2014-2026 Steven Van Vaerenbergh
// Licensed under the MIT license

(function() {
  // Bitcoin address regex: P2PKH (1...), P2SH (3...), and Bech32 (bc1...)
  var addressRegex = /\b([13][1-9A-HJ-NP-Za-km-z]{26,33}|bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39,59})\b/g;

  // Walk through the DOM tree and process all text nodes
  function walk(node) {
    var child, next;
    try {
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
        case 3:  // Text node
          if (node.parentElement.tagName.toLowerCase() !== 'script') {
            processTextNode(node);
          }
          break;
      }
    } catch (err) {
      console.log('[BitcoinSneakPeek] Error:', err);
    }
  }

  // Check if a text node is inside a link
  function nodeInLink(textNode) {
    var curNode = textNode;
    while (curNode) {
      if (curNode.tagName === 'A') return true;
      curNode = curNode.parentNode;
    }
    return false;
  }

  // Create a holder span for the Bitcoin icon and result
  function createHolderSpan(address) {
    var span = document.createElement('span');
    span.setAttribute('key', address);
    span.className = 'bbHolder';
    return span;
  }

  // Insert a span after a text node, returns the remainder text node
  function insertSpanInTextNode(textNode, address, at) {
    var span = createHolderSpan(address);
    var remainder = textNode.splitText(at);
    textNode.parentNode.insertBefore(span, remainder);
    return remainder;
  }

  // Insert a span after the parent link element
  function insertSpanAfterLink(textNode, address) {
    var curNode = textNode;
    while (curNode) {
      if (curNode.tagName === 'A') {
        var span = createHolderSpan(address);
        curNode.parentNode.insertBefore(span, curNode.nextSibling);
        return;
      }
      curNode = curNode.parentNode;
    }
  }

  // Clear node and append new elements
  function setNodeContent(node, elements) {
    node.textContent = '';
    elements.forEach(function(el) { node.appendChild(el); });
  }

  // Create a text node with leading space
  function createText(text) {
    return document.createTextNode(' ' + text);
  }

  // Create a safe anchor element
  function createLink(url, text) {
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = text;
    return a;
  }

  // Load balance data via background service worker
  function loadData(node, publicKey, skipCount) {
    setNodeContent(node, [createText('Loading...')]);
    console.log('[BitcoinSneakPeek] Requesting balance for:', publicKey, skipCount ? '(skipping ' + skipCount + ' providers)' : '');

    chrome.runtime.sendMessage(
      { action: 'fetchBalance', address: publicKey, skipCount: skipCount || 0 },
      function(response) {
        // Check for chrome.runtime errors (e.g., service worker not responding)
        if (chrome.runtime.lastError) {
          console.error('[BitcoinSneakPeek] Runtime error:', chrome.runtime.lastError.message);
          setNodeContent(node, [
            createText('Error: Extension issue. Try reloading. '),
            createLink('https://www.blockchain.com/explorer/addresses/btc/' + publicKey, 'View on Blockchain.com')
          ]);
          return;
        }

        if (response && response.success) {
          console.log('[BitcoinSneakPeek] Success:', response.source);
          setNodeContent(node, [
            createText('Balance: ' + response.balance + ' BTC. Received: ' + response.received + ' BTC. '),
            createLink(response.url, response.source)
          ]);
        } else {
          var errorMsg = response ? response.error : 'No response from extension';
          console.error('[BitcoinSneakPeek] Failed:', errorMsg);
          setNodeContent(node, [
            createText(errorMsg + ' '),
            createLink('https://www.blockchain.com/explorer/addresses/btc/' + publicKey, 'View on Blockchain.com')
          ]);
        }
      }
    );
  }

  /*
  * Action to perform when clicking on icon.
  * Hold modifier keys to test different providers:
  *   Shift = skip 1 (Mempool.space)
  *   Ctrl/Cmd = skip 2 (Blockstream.info)
  *   Alt/Option + Shift = skip 3 (BlockCypher)
  */
  function bbToggle(event){
    var resultSpan = this.nextSibling;
    var isEmpty = !resultSpan.firstChild || resultSpan.textContent === '';

    if (isEmpty) {
      resultSpan.style.display = 'inline';
      var publicKey = this.parentNode.getAttribute('key');

      // Determine how many providers to skip based on modifier keys
      var skipCount = 0;
      if (event) {
        if (event.altKey && event.shiftKey) {
          skipCount = 3; // Alt/Option + Shift: skip to BlockCypher
        } else if (event.ctrlKey || event.metaKey) {
          skipCount = 2; // Ctrl/Cmd: skip to Blockstream.info
        } else if (event.shiftKey) {
          skipCount = 1; // Shift: skip to Mempool.space
        }
      }

      loadData(resultSpan, publicKey, skipCount);
    } else {
      resultSpan.style.display = (resultSpan.style.display === 'none') ? 'inline' : 'none';
    }
  }

  // Add an image and an empty span to bbHolder spans
  function addHolderContent(context) {
    try {
      var list = context.getElementsByClassName('bbHolder');
      for (var i = 0, len = list.length; i < len; i++) {
        var holder = list[i];
        if (holder.childNodes.length > 0) continue; // Already processed

        var img = document.createElement('img');
        img.src = chrome.runtime.getURL('i/bitcoinsneakpeek32.png');
        img.className = 'bitcoinBalanceIcon';
        img.title = 'Bitcoin Sneak Peek';
        img.alt = '';
        img.style.cssText = 'height:1em;vertical-align:-10%;cursor:pointer;margin-left:.5em;display:inline';
        holder.appendChild(img);

        var span = document.createElement('span');
        span.style.display = 'none';
        holder.appendChild(span);
      }
    } catch (err) {
      console.log('[BitcoinSneakPeek] Error:', err);
    }
  }

  // Process a text node to find and mark Bitcoin addresses
  function processTextNode(textNode) {
    var val = textNode.nodeValue;
    var re = new RegExp(addressRegex.source, 'g');

    if (!re.test(val)) return;

    // Reset regex after test
    re.lastIndex = 0;

    if (nodeInLink(textNode)) {
      // Address inside a link: place span after the link
      var match = val.match(re);
      if (match) insertSpanAfterLink(textNode, match[0]);
    } else {
      // Address in regular text: place span after each address
      var myArray, prev = 0, curNode = textNode;
      while ((myArray = re.exec(val)) !== null) {
        curNode = insertSpanInTextNode(curNode, myArray[0], re.lastIndex - prev);
        prev = re.lastIndex;
      }
    }
  }

  // Observe DOM mutations for dynamically added content
  function observeMutations() {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        for (var i = 0; i < mutation.addedNodes.length; i++) {
          var node = mutation.addedNodes[i];
          if (node.nodeType === 1) processNewNode(node);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Process a newly added DOM node
  function processNewNode(node) {
    walk(node);
    addHolderContent(node);
    bindClickHandlers(node);
  }

  // Bind click handlers to Bitcoin icons, avoiding duplicates
  function bindClickHandlers(context) {
    var icons = context.getElementsByClassName('bitcoinBalanceIcon');
    for (var i = 0; i < icons.length; i++) {
      if (!icons[i].hasAttribute('data-bb-bound')) {
        icons[i].addEventListener('click', bbToggle, false);
        icons[i].setAttribute('data-bb-bound', 'true');
      }
    }
  }

  // Initialize
  function main(target) {
    walk(target);
    addHolderContent(target);
    bindClickHandlers(target);
  }

  main(document.body);
  observeMutations();

})();
