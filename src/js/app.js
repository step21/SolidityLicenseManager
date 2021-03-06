App = {
  web3Provider: null,
  licenseData: null,
  rentBalance: 0,
  contracts: {},
  init: function() {
    // Load licenses.
    $.getJSON('./license.json', function(licenseData) {
      var licenseRow = $('#licenseRow');
      var licenseTemplate = $('#licenseTemplate');
      App.licenseData = licenseData;
      for (i = 0; i < licenseData.length; i ++) {
        console.log("licenseData: "+licenseData[i].name);
        licenseTemplate.find('.panel-title').text(licenseData[i].name);
        licenseTemplate.find('img').attr('src', licenseData[i].picture);
        licenseTemplate.find('.owner').text(licenseData[i].owner);
        licenseTemplate.find('.licensor').text(licenseData[i].licensor);
        licenseTemplate.find('.rate').text(licenseData[i].rate);
        licenseTemplate.find('.timeLeft').text(licenseData[i].timeLeft);
        licenseTemplate.find('.btn-license').attr('data-id', licenseData[i].id);
        licenseTemplate.find('.btn-claim').attr('data-id', licenseData[i].id);
        licenseTemplate.find('.btn-setrate').attr('data-id', licenseData[i].id);
        licenseTemplate.find('.btn-setsale').attr('data-id', licenseData[i].id);
        licenseTemplate.find('.btn-purchase').attr('data-id', licenseData[i].id);
        licenseTemplate.find('.btn-cancelsale').attr('data-id', licenseData[i].id);
        licenseRow.append(licenseTemplate.html());
      }
    });

    return App.initWeb3();
  },

  initWeb3: function() {
    // Initialize web3 and set the provider to the testRPC.
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // set the provider you want from Web3.providers
      App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:9545');
      web3 = new Web3(App.web3Provider);
    }

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('LicenseManager.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var LicenseManagerArtifact = data;
      App.contracts.LicenseManager = TruffleContract(LicenseManagerArtifact);

      // Set the provider for our contract.
      App.contracts.LicenseManager.setProvider(App.web3Provider);

      // Use our contract to retrieve and mark the current license holders
      for (i = 0; i < App.licenseData.length; i ++) {
        var licenseId = App.licenseData[i].id;
        App.markLicenses(licenseId);
      }
      App.handleGetBalance();
   //   App.setSaleAddress();
    });

    $.getJSON('LicenseSale.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var LicenseSaleArtifact = data;
      App.contracts.LicenseSale = TruffleContract(LicenseSaleArtifact);

      // Set the provider for our contract.
      App.contracts.LicenseSale.setProvider(App.web3Provider);

      App.handleGetSale();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-claim', App.handleClaim);
    $(document).on('click', '.btn-license', App.handleLicense);
    $(document).on('click', '.btn-setrate', App.handleSetRate);
    $(document).on('click', '.btn-setsale', App.handleSetSale);
    $(document).on('click', '.btn-getbalance', App.handleWithdrawBalance);
    $(document).on('click', '.btn-cancelsale', App.handleCancelSale);
    $(document).on('click', '.btn-purchase', App.handlePurchase);
  },

  markLicenses: function(licenseId, account) {
    var licenseInstance;
    var ownerId;
    $('.panel-license').eq(licenseId).find('.panel-claim').show();          
    $('.panel-license').eq(licenseId).find('.panel-licbutton').hide();          
    $('.panel-license').eq(licenseId).find('.panel-rate').hide();          
    $('.panel-license').eq(licenseId).find('.panel-sale').hide();          
    $('.panel-license').eq(licenseId).find('.panel-cancelsale').hide();          
    $('.panel-license').eq(licenseId).find('.panel-saleprice').hide();          
    $('.panel-license').eq(licenseId).find('.panel-avail').hide();
    $('.panel-license').eq(licenseId).find('.panel-purchase').hide();
    $('.panel-license').eq(licenseId).find('.panel-notavail').show();

    web3.eth.getAccounts(function(error, accounts) {
      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        
        return licenseInstance.ownerOf.call(licenseId);
      }).then(function(result) {
          console.log("License owner of "+ licenseId + " = "+ result);
          ownerId = result;
          if (ownerId == "0x") { // No owner
            $('.panel-license').eq(licenseId).find('.owner').text("Available");          
          } else {
            $('.panel-license').eq(licenseId).find('.owner').text(result.substring(0,10) + "...");          
          }
          return licenseInstance.isLicenseAvailable.call(licenseId);
      }).then(function(result) {
          console.log("License avail of "+ licenseId + " = "+ result);
          // If the license is available
          if (result) {
            // Turn on the panel for the license stats
            $('.panel-license').eq(licenseId).find('.licensor').text("Available");          
            $('.panel-license').eq(licenseId).find('.panel-claim').hide();          
            // For the owner, turn on rate button and turn off license
            if (accounts[0] === ownerId) {
              $('.panel-license').eq(licenseId).find('.panel-rate').show();          
              $('.panel-license').eq(licenseId).find('.panel-sale').show();          
              $('.panel-license').eq(licenseId).find('.panel-licbutton').hide();          
            } else {
              // Others can license
              $('.panel-license').eq(licenseId).find('.panel-licbutton').show();          
            }         
            $('.panel-license').eq(licenseId).find('.panel-avail').show();
            $('.panel-license').eq(licenseId).find('.panel-notavail').hide();
          } else if (ownerId !== "0x") {
            // Not available so turn off that stuff but leave the owner rate button
            $('.panel-license').eq(licenseId).find('.panel-avail').hide();
            $('.panel-license').eq(licenseId).find('.panel-claim').hide();          
            $('.panel-license').eq(licenseId).find('.btn-claim').hide();
            if (accounts[0] === ownerId) {
              $('.panel-license').eq(licenseId).find('.panel-rate').show();          
              $('.panel-license').eq(licenseId).find('.panel-sale').show();          
            }         
            $('.panel-license').eq(licenseId).find('.panel-licbutton').hide();
            // Update the stats of license.
            App.handleUpdateLicense(licenseId);
          }
          App.handleGetRate(licenseId);
          App.handleGetSale(licenseId);
        }).catch(function(err) {
          console.log(err.message);
      });
    });
  },

  handleGetRate: function(licenseId) {

    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.getLicenseRate.call(licenseId);
      }).then(function(result) {
        console.log("getLicenseRate " + result);
        var ethRate = web3.fromWei(result,"ether").toFixed(6);
        $('.panel-license').eq(licenseId).find('.rate').text(ethRate);
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleGetLicensor: function(licenseId) {

    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.getLicenseHolder.call(licenseId);
      }).then(function(result) {
        console.log("getLicenseHolder " + result);
        $('.panel-license').eq(licenseId).find('.licensor').text(result.substring(0,10) + "...");
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleGetBalance: function(licenseId) {

    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.getBalance.call(licenseId);
      }).then(function(result) {
        var ethRate = web3.fromWei(result,"ether").toFixed(6);
        console.log("getBalance " + result);
        rentBalance = result;
        $(document).find('.btn-getbalance').text("Rental Balance (Ether): "+ethRate);
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },
  
  handleWithdrawBalance: function(licenseId) {

    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      if (rentBalance <= 0)
        return;
      var account = accounts[0];
      console.log("withdrawBalance start");

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.withdrawBalance();
      }).then(function(result) {
        console.log("withdrawBalance Success");
        App.handleGetBalance();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleUpdateLicense: function(licenseId) {

    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      var timeLeft = 0.0;
      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.getLicenseTimeLeft.call(licenseId);
      }).then(function(result) {
        timeLeft = (result / (60.0 * 60.0 * 24.0)).toFixed(2);
        console.log("License time " + result);
        if (result > 0) {
          $('.panel-license').eq(licenseId).find('.timeLeft').text(timeLeft);
          $('.panel-license').eq(licenseId).find('.panel-avail').show();
          $('.panel-license').eq(licenseId).find('.panel-notavail').hide();  
          $('.panel-license').eq(licenseId).find('.panel-rate').hide();          
          $('.panel-license').eq(licenseId).find('.panel-sale').hide();          
          App.handleGetLicensor(licenseId); 
        } else {
          $('.panel-license').eq(licenseId).find('.timeLeft').text("0");          
        }
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleLicense: function(event) {
    event.preventDefault();

    var licenseId = parseInt($(event.target).data('id'));
    var length = $('.panel-license').eq(licenseId).find('.in-licdays').val();
    if (length <= 0)
      return;
    console.log("Length "+ length);
    var rate = $('.panel-license').eq(licenseId).find('.rate').text();
    console.log("Rate "+ rate);
    if (rate <= 0)
      return;

    var cost = rate * length;
    cost = web3.toWei(cost,"ether");
    console.log("Cost "+ cost);
    var licenseInstance;

    console.log("Handle license");
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        var owner = licenseInstance.ownerOf.call(licenseId);

        console.log("claim owner "+ owner);
        return licenseInstance.obtainLicense(licenseId, length,  {value: cost, from: account});
      }).then(function(result) {
        location.reload();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleClaim: function(event) {
    event.preventDefault();
    console.log("Handle claim");

    var licenseId = parseInt($(event.target).data('id'));

    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.createLicense(licenseId, {from: account});
      }).then(function(result) {
        console.log("Claim succeeded: "+ result);
        for (var i = 0; i < result.logs.length; i++) {
          var log = result.logs[i];
          console.log("event "+log.event + ", " + log.args);
        }
          location.reload();
//        return App.getBalances();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleSetRate: function(event) {
    event.preventDefault();
    var licenseId = parseInt($(event.target).data('id'));
    var rate = $('.panel-license').eq(licenseId).find('.in-setrate').val();
    console.log("Handle set rate " + rate);
    if (rate == 0)
      return;
    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.setLicenseRate(licenseId, web3.toWei(rate,"ether"), {from: account});
      }).then(function(result) {
        console.log("SetRate: success");
//        App.handleGetRate();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleSetSale: function(event) {
    event.preventDefault();
    var licenseId = parseInt($(event.target).data('id'));
    var rate = $('.panel-license').eq(licenseId).find('.in-setsale').val();
    console.log("Handle set: " + licenseId + "= " + rate);
    if (rate == 0)
      return;
    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
    
        return licenseInstance.createSale(licenseId, web3.toWei(rate,"ether"), {from: account});
      }).then(function(result) {
        console.log("setSale success "+result);

      }).catch(function(err) {
        console.log("SetSale error: "+ err.message);
      });
    });
  },
  
  handleCancelSale: function(event) {
    event.preventDefault();
    var licenseId = parseInt($(event.target).data('id'));
    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseSale.deployed().then(function(instance) {
        licenseInstance = instance;
    
        return licenseInstance.cancelSale(licenseId, {from: account});
      }).then(function(result) {
        console.log("cancelSale success "+result);

      }).catch(function(err) {
        console.log("cancelSale error: "+ err.message);
      });
    });
  },

  handlePurchase: function(event) {
    event.preventDefault();
    var licenseId = parseInt($(event.target).data('id'));
    var cost = $('.panel-license').eq(licenseId).find('.saleprice').text();
    cost = web3.toWei(cost,"ether");
    console.log("Purchase cost ="+cost);
    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseSale.deployed().then(function(instance) {
        licenseInstance = instance;
    
        return licenseInstance.buy(licenseId, {value: cost, from: account});
      }).then(function(result) {
        console.log("handlePurchase success "+result);

      }).catch(function(err) {
        console.log("handlePurchase error: "+ err.message);
      });
    });
  },
    
  handleGetSale: function(licenseId) {
    var licenseInstance;

    console.log("handleSale");
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseSale.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.getSale.call(licenseId);
 //       return licenseInstance.getLicenseSaleAddress.call();
      }).then(function(result) {
        if (result[0] != "0x") { // for sale
          $('.panel-license').eq(licenseId).find('.owner').text(result[0].substring(0,10) + "...FOR SALE");          
          $('.panel-license').eq(licenseId).find('.panel-saleprice').show();  
          var ethRate = web3.fromWei(result[1],"ether").toFixed(4);
          $('.panel-license').eq(licenseId).find('.saleprice').text(ethRate);
          if (accounts[0] === result[0]) {
            $('.panel-license').eq(licenseId).find('.panel-cancelsale').show();          
          } else {
            $('.panel-license').eq(licenseId).find('.panel-purchase').show();          
          }
        }

        console.log("getSale " + result[0]);
      }).catch(function(err) {
        console.log("GetSale error: "+ err.message);
      });
    });
  },

  setSaleAddress: function(event) {
    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var saleAddress = 0;
      var account = accounts[0];

      App.contracts.LicenseSale.deployed().then(function(instance) {
        licenseInstance = instance;
        saleAddress = licenseInstance.address;
      }).then(function(result) {
        App.contracts.LicenseManager.deployed().then(function(instance) {
          licenseInstance = instance;
          return licenseInstance.setLicenseSaleAddress(saleAddress);
        }).then(function(result) {
          console.log("SetSaleAddress success");
        }).catch(function(err) {
          console.log("SetSaleAddress error: "+ err.message);
        });
      }).catch(function(err) {
        console.log("GetSale error: "+ err.message);
      });
    });
  },

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
