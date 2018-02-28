App = {
  web3Provider: null,
  licenseData: null,
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
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-claim', App.handleClaim);
    $(document).on('click', '.btn-license', App.handleLicense);
    $(document).on('click', '.btn-setrate', App.handleSetRate);
  },

  markLicenses: function(licenseId, account) {
    var licenseInstance;
    var ownerId;
    $('.panel-license').eq(licenseId).find('.btn-claim').show();          
    $('.panel-license').eq(licenseId).find('.btn-license').hide();          
    $('.panel-license').eq(licenseId).find('.btn-setrate').hide();          
    $('.panel-license').eq(licenseId).find('.panel-avail').hide();

    web3.eth.getAccounts(function(error, accounts) {
      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
      
        return licenseInstance.ownerOf.call(licenseId);
      }).then(function(result) {
          console.log("License owner of "+ licenseId + " = "+ result);
          ownerId = result;
          $('.panel-license').eq(licenseId).find('.owner').text(result.substring(0,10) + "...");          
          return licenseInstance.isLicenseAvailable.call(licenseId);
      }).then(function(result) {
          console.log("License avail of "+ licenseId + " = "+ result);
          if (result) {
            $('.panel-license').eq(licenseId).find('.licensor').text("Available");          
            $('.panel-license').eq(licenseId).find('.btn-claim').hide();          
            $('.panel-license').eq(licenseId).find('.btn-license').show();          
            if (accounts[0] === ownerId) {
              $('.panel-license').eq(licenseId).find('.btn-setrate').show();          
            }         
            $('.panel-license').eq(licenseId).find('.panel-avail').show();
            App.handleGetRate(licenseId);
          } else {
            $('.panel-license').eq(licenseId).find('.panel-avail').hide();
            $('.panel-license').eq(licenseId).find('.btn-claim').hide();
            if (accounts[0] === ownerId) {
              $('.panel-license').eq(licenseId).find('.btn-setrate').show();          
            }         
            $('.panel-license').eq(licenseId).find('.btn-license').hide();          
            // return licenseInstance.getLicenseHolder.call(licenseId);
          }
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
        console.log("getRate " + result);
        $('.panel-license').eq(licenseId).find('.rate').text(result);
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleLicense: function(event) {
    event.preventDefault();

    var licenseId = parseInt($(event.target).data('id'));

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
        return licenseInstance.createLicense(licenseId, {from: account});
      }).then(function(result) {
        location.reload();
//        return App.getBalances();
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
        location.reload();
//        return App.getBalances();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  handleSetRate: function(event) {
    event.preventDefault();
    console.log("Handle set rate");

    var licenseId = parseInt($(event.target).data('id'));

    var licenseInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.LicenseManager.deployed().then(function(instance) {
        licenseInstance = instance;
        return licenseInstance.setLicenseRate(licenseId, 200, {from: account});
      }).then(function(result) {
        location.reload();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
