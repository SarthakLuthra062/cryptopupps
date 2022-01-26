const wax = new waxjs.WaxJS({
  rpcEndpoint: 'https://waxtestnet.greymass.com',
  tryAutoLogin: false
});
const transport = new AnchorLinkBrowserTransport();
    const anchorLink = new AnchorLink({
      transport,
      chains: [{
        chainId: 'f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12',
        nodeUrl: 'https://waxtestnet.greymass.com',
      }],
    });
const dapp = "CryptoPupps";
const endpoint = "testnet.wax.pink.gg";
const tokenContract = {
  WAX: "eosio.token"
};

var t = 0;

var anchorAuth = "owner";
var homescreen = true;
var loggedIn = false;
var collection = 'puppyteststk';
var switchtoshop = false;
var canclick = false;
var mainDiv = document.getElementById("maindiv");
var loader = document.getElementById('loader').style;
var switchtoblends = false;
main();

async function main() {
  if (!loggedIn)
    autoLogin();
  else if(loggedIn)
  {
    if(!homescreen)
    {
      clearUi();
      loader.display = "block";

      balancepromise = GetBalance();
      balance = await balancepromise;
      console.log("balance " + new Date().toUTCString());

      pack = GetShop();
      pack_data = await pack;
      switchtoshop?PopulateShop(pack_data,balance):"";
      console.log("pack " + new Date().toUTCString());

      if(!switchtoshop){
        ratespromise = GetRates();
        rates = await ratespromise;
        console.log("rate " + new Date().toUTCString());

        assetPromise = GetAssets(collection, rates);
        assets = await assetPromise;
        console.log("asset " + new Date().toUTCString());

        stakepromise = FilterStaked(assets);
        staked = await stakepromise;
        console.log("stk " + new Date().toUTCString());

        userpromise = GetUser(rates, staked);
        user = await userpromise;
        console.log("user " + new Date().toUTCString());

        unstaked = FilterUnstaked(assets, staked);
        !homescreen?PopulateMenu(rates,staked, unstaked, balance):"";
        canclick = true;
        console.log("ui " + new Date().toUTCString());
      }
    }
  }
}

async function stakeall() {

  if (unstaked.length == 0) {
    ShowToast("No unstaked assets!");
    return;
  }
  if (loggedIn) {

    HideMessage();

    var ids = [];
    for (let i = 0; i < unstaked.length; i++) {
      ids.push(parseInt(unstaked[i].asset_id));
    }
    try {

      const result = await wallet_transact([{
        account: contract,
        name: "stakeassets",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: {
          asset_ids: ids,
          _user: wallet_userAccount,
        },
      }, ]);
      main();
      ShowToast("All Assets Staked Successfully !");
    } catch (e) {
      console.log(e);
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

async function stakeasset(assetId) {

  if (loggedIn) {

    HideMessage();

    try {
      const result = await wallet_transact([{
        account: contract,
        name: "stakeassets",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: {
          _user: wallet_userAccount,
          asset_ids: [assetId]
        },
      }, ]);
      console.log(result);
      main();
      ShowToast("All Assets Staked Successfully !");
    } catch (e) {
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

async function buypack(template,price,qty){
  if (loggedIn) {

    HideMessage();

    try {
      totalPrice = (price * qty).toFixed(4);
      const result = await wallet_transact([{
        account: "puppyzztoken",
        name: "transfer",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: {
          from: wallet_userAccount,
          to: marketContract,
          quantity: totalPrice.toString() + " "+ symbol, 
          memo: template + "%pack"
        },
      }, ]);
      ShowToast("Pack bought successfully - " + result.transaction_id);
      main();
    } catch (e) {
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

function delay(delayInms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(2);
    }, delayInms);
  });
}

async function assetunstake(assetId) {
  if (loggedIn) {

    HideMessage();

    try {

      var data1 = {
        asset_ids: [assetId]
      };
      const result = await wallet_transact([{
        account: contract,
        name: "removenft",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: data1,
      }, ]);
      console.log(result.transaction_id);
      main();
      ShowToast("Asset Unstaked Successfully");
    } catch (e) {
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

async function claimbalance() {
  if (loggedIn) {

    HideMessage();

    try {

      var data1 = {
        _user: wallet_userAccount,
      };
      const result = await wallet_transact([{
        account: contract,
        name: "claim",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: data1,
      }, ]);
      ShowToast("Reward Claimed Successfully !");
      balancepromise = GetBalance();
      balance = await balancepromise;
      document.getElementById('balance').innerHTML = balance.toLocaleString('en-US') + " " + symbol;
    } catch (e) {
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

function FilterUnstaked(assets, staked) {
  let results = [];
  for (let i = 0; i < assets.length; i++) {
    var check = false;
    for (let j = 0; j < staked.length; j++) {
      if (staked[j] == assets[i])
        check = true;
    }
    if (!check) {
      results.push(assets[i]);
    }
  }
  return results;
}

async function FilterStaked(assets) {

  let results = [];
  var path = "/v1/chain/get_table_rows";
  var data = JSON.stringify({
    json: true,
    code: "puppyzzstake",
    scope: "puppyzzstake",
    table: "nfts",
    key_type: `i64`,
    index_position: 2,
    lower_bound: eosjsName.nameToUint64(wallet_userAccount),
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();
  var data = body.rows;
  if(typeof data[0] !== "undefined"){
    for (let i = 0; i < assets.length; i++) {
      for(let j=0;j<data.length;j++)
      {
    if(data[j].asset_id == assets[i].asset_id && data[j].account == wallet_userAccount)
    results.push(assets[i]);
      }
    }
  }
  return results;
}

async function GetUser(rates) {

  var path = "/v1/chain/get_table_rows";

  var data = JSON.stringify({
    json: true,
    code: "puppyzzstake",
    scope: "puppyzzstake",
    table: "user",
    limit: 1,
    lower_bound: wallet_userAccount,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();

  var user = {
    stakePower: 0,
    next_claim: "-",
    unclaimed_amount: 0,
  };
  if (body.rows.length != 0) {
    for (let j = 0; j < body.rows[0].data.length; j++) {
    var datex=Date(body.rows[0].data[j].last_claim);
    var now= new Date();
    var date=Math.floor(now/1000);    
    const utcMilllisecondsSinceEpoch = now.getTime() 
    const utcSecondsSinceEpoch = Math.round(utcMilllisecondsSinceEpoch / 1000) 
    
    var ts = -utcSecondsSinceEpoch+ 3600+ body.rows[0].data[j].last_claim;
    user.next_claim=ts;
    }
    if(t!=0)
    restartTimer();

   startTimer(ts);

  }
  return user;
}

function startTimer(duration) {
  var timer = duration, minutes, seconds;
  if(t!=0) restartTimer(t);
  t=setInterval(function () {
      hours=  parseInt(timer / 3600, 10)
      minutes = parseInt((timer-hours*3600) / 60,10);
      seconds = parseInt(timer % 60, 10);

      hours = hours < 10 ? "0" + hours : hours;

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds; 
      display= minutes+":"+seconds;
      if (--timer < 0) {
          timer =0;
      }
  },1000);
}

function restartTimer(t)
{
  clearInterval(t);
}

async function GetAssets(colc,rates) {
  let results = [];
  var path = "atomicassets/v1/assets?collection_name=" + colc + "&owner=" + wallet_userAccount + "&page=1&limit=1000&order=desc&sort=asset_id";
  const response = await fetch("https://" + "test.wax.api.atomicassets.io/" + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    method: "POST",
  });

  const body = await response.json();
  level = await GetStakingTableRows();

  if(level != 0){
    for(i = 0; i < body.data.length; i++){
      var data = body.data[i];
      for(n = 0; n < level.length; n++){
        if(data.template.template_id == level[n].id){
          var rate = 0;
          for (let j = 0; j < rates.length; j++) {
            if (data.collection.collection_name == rates[j].pool) {
              for (let k = 0; k < rates[j].levels.length; k++) {
                if (rates[j].levels[k].key == level[n].level) {
                  rate = parseFloat(rates[j].levels[k].value);
                }
              }
            }
          }
          results.push({
            asset_id: data.asset_id,
            img: data.data.img,
            name: data.name,
            rateperday: rate.toFixed(4)*1,
          });
        }
      }
    }
  }
  return results;
}

async function GetRates() {
  var path = "/v1/chain/get_table_rows";

  var data = JSON.stringify({
    json: true,
    code: "puppyzzstake",
    scope: "puppyzzstake",
    table: "collections",
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  var rates = [];
  const body = await response.json();
  console.log(body);

  if (body.rows.length != 0) {
    for (let i = 0; i < body.rows.length; i++) {
      rates.push({
        pool: body.rows[i].pool,
        bonuses: body.rows[i].bonuses,
        levels: body.rows[i].levels,
      })
    }
  }
  return rates;
}

async function GetStakingTableRows() {

  var path = "/v1/chain/get_table_rows";

  var data = JSON.stringify({
    json: true,
    code: "puppyzzstake",
    scope: "puppyzzstake",
    table: "leveltemp",
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();
  var ids = [];
  if (body.rows.length != 0) {
    for (let i = 0; i < body.rows.length; i++) {
      for (let j = 0; j < body.rows[i].template_ids.length; j++) {
        ids.push({
          id:body.rows[i].template_ids[j],
          level:body.rows[i].level
        });
      }
    }
    return ids;
  }
  return 0;
}

async function GetBalance() {

  var path = "/v1/chain/get_table_rows";

  var data = JSON.stringify({
    json: true,
    code: "puppyzztoken",
    scope: wallet_userAccount,
    table: "accounts",
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();
  balance=parseFloat(0.0000);
  if (body.rows.length != 0) {
    for (j = 0; j < body.rows.length; j++) {
      console.log(body.rows[j].balance);
      if (body.rows[j].balance.includes(symbol))
        balance = parseFloat(body.rows[j].balance).toFixed(4);
        return balance;
    }
  }
  return balance;
}

async function GetShop() {

  var path = "/v1/chain/get_table_rows";
  var data = JSON.stringify({
    json: true,
    code: "puppyzzmarkt",
    scope: "puppyzzmarkt",
    table: "listings",
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();
  var packs = [];
  var data = [];

  if (body.rows.length != 0) {
    for (j = 0; j < body.rows.length; j++) {
      r = GetTemplateData(body.rows[j].collection_name,body.rows[j].template_id);
      result = await r;
      cost = body.rows[j].price.split(" ");
      packs.push({
        name: result[0].name,
        img: result[0].img,
        price: cost[0],
        template:body.rows[j].template_id,
        id:body.rows[j].id,
        total:body.rows[j].total,
        available:body.rows[j].available,
        schema_name:body.rows[j].schema_name
      });
    }
  }
  return packs;
}

async function GetTemplateData(colc, id){
  var path = "atomicassets/v1/templates/" + colc + "/" + id;
  const response = await fetch("https://test.wax.api.atomicassets.io/" + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    method: "POST",
  });

  const body = await response.json();
  result = [];
  result.push({
    name: body.data.name,
    img: body.data.immutable_data.img
  });
  return result;
}

function PopulateShop(pack_data,balance){

  document.getElementById("letsstake").src = "./assets/pupmarket.PNG";
  document.getElementById("letsstake").style.visibility = "visible";
  let src = "https://ipfs.wecan.dev/ipfs/";
  var blend_data = [];
  var packData = [];
  for(let data of pack_data){
    if(data.schema_name == "blends")
      blend_data.push(data);
    else
      packData.push(data);
  }
  var data = [];
  console.log(switchtoblends);
  if(!switchtoblends)
    data = packData;
  else
    data = blend_data;

  if(data.length < 1)
    ShowToast("No Listing Yet");
  for(var index = 0; index < data.length; ++index){

    var items = document.createElement('div');
    items.className = "shopwrapper";

    var div = document.createElement('div');
    div.id = 'tablecontainer';
    div.className = 'shoptablecontainer';

    img2 = document.createElement('img');
    img2.src = src + data[index].img;
    console.log(img2.src);
    img2.className = 'shopnft';
    items.appendChild(img2);

    var div2 = document.createElement('p');
    div2.textContent = data[index].name;
    div2.className = 'textstyle';
    items.appendChild(div2);

    var Text = document.createElement('p');
    Text.className = "incrementor-text";
    let number = 1;
    var minusbtn = document.createElement('button');
    minusbtn.className = "incrementor-btn";
    var parentdiv = document.createElement('div');
    parentdiv.className = 'parentdiv';
    Text.textContent = number;
    var plusbtn = document.createElement('button');
    plusbtn.className = "incrementor-btn";
    parentdiv.appendChild(minusbtn);
    parentdiv.appendChild(Text);
    parentdiv.appendChild(plusbtn);
    items.appendChild(parentdiv);

    var ratesText = document.createElement('p');
    ratesText.className = "rates";
    var rate = document.createElement('div');
    rate.className = 'ratesText';
    ratesText.textContent = data[index].price;
    let price = data[index].price
    rate.appendChild(ratesText);
    items.appendChild(rate);
    minusbtn.onclick = async function(){
      if(Text.textContent > 1){
        Text.textContent = parseFloat(Text.textContent) - 1 ;
        ratesText.textContent = (parseFloat(price) * parseFloat(Text.textContent)).toFixed(4);
      }
      else
        ShowToast("Minimum value cannot be less than 1");
    };
    plusbtn.onclick = async function(){
      if(Text.textContent < 5){
        Text.textContent = parseFloat(Text.textContent) + 1 ;
        ratesText.textContent = (parseFloat(price) * parseFloat(Text.textContent)).toFixed(4);
      }
      else
        ShowToast("Maximum limit is 5");
    };

    let btn = document.createElement('input');
    btn.className = "buybtn";
    btn.type = "image";
    btn.src = "./assets/buybtn.PNG";
    btn.id = data[index].id;
    btn.onclick = async function buy(){
      buypack(btn.id,price,parseFloat(Text.textContent));
    }
    div.appendChild(items);
    div.appendChild(btn);
    mainDiv.appendChild(div);
  }
    loader.display = "none";
    mainDiv.style.display = "block";
}

function PopulateMenu(rates,staked, unstakeasset, balance) {
  let src = "https://ipfs.wecan.dev/ipfs/";
  var all_assets = [{staked,unstakeasset}];
  console.log(all_assets);
  var pools = "";
  var ids = [];
  var stakepower=0.00;
  for (let i = 0; i < unstaked.length; i++) {
    ids.push(parseInt(unstaked[i].asset_id));
  }

  document.getElementById("letsstake").src = "./assets/lets_stake (1).png";
  document.getElementById("letsstake").style.visibility = "visible";

  var user_balance = document.createElement('p');
  user_balance.textContent = "User Balance : " + balance.toLocaleString('en-US') + " " + symbol;
  document.getElementById('balance').appendChild(user_balance);

  if(all_assets[0].unstakeasset.length < 1 && all_assets[0].staked.length < 1){
    loader.display = "none";
    document.getElementById('balance').style.display = "block";
    document.getElementById('staking').style.display = "block";
    ShowToast("No Assets To Display !");
    return;
  }
  else
  {
    unstaked.forEach(element => {
      stakepower+=element.rateperday;
    });
  }

  for (var index = 0; index < all_assets[0].unstakeasset.length; ++index) {

    var items = document.createElement('div');
    items.className = "itemwrapper";
    items.id = index;

    var div = document.createElement('div');
    div.id = 'tablecontainer';
    div.className = 'tablecontainer';

    img2 = document.createElement('img');
    img2.src = src + all_assets[0].unstakeasset[index].img;
    img2.className = 'nftimg';
    items.appendChild(img2);

    var ratesText = document.createElement('p');
    ratesText.className = "rates";
    var rate = document.createElement('div');
    rate.className = 'ratesText';
    ratesText.textContent = all_assets[0].unstakeasset[index].rateperday.toFixed(4);
    rate.appendChild(ratesText);
    items.appendChild(rate);

    var bar = document.createElement('div');
    bar.className = "bar";

    let stkbtn = document.createElement('button');
    stkbtn.className = "stkbtn"
    stkbtn.id = all_assets[0].unstakeasset[index].asset_id;
    stkbtn.onclick = async function s(){
    stakeasset(stkbtn.id)};

    bar.appendChild(stkbtn);
    div.appendChild(items);
    div.appendChild(bar);
    mainDiv.appendChild(div);
    let h = mainDiv.offsetHeight;
    document.getElementById("homediv").style.height = h + "px";
    console.log(document.getElementById("homediv").offsetHeight);
  }

  for (var index = 0; index < all_assets[0].staked.length; ++index) {

      var items = document.createElement('div');
      items.className = "itemwrapper";
      items.id = index;

      var div = document.createElement('div');
      div.id = 'tablecontainer';
      div.className = 'tablecontainer';

      img2 = document.createElement('img');
      img2.src = src + all_assets[0].staked[index].img;
      img2.className = 'nftimg';
      items.appendChild(img2);

      var ratesText = document.createElement('p');
      ratesText.className = "rates";
      var rate = document.createElement('div');
      rate.className = 'ratesText';
      ratesText.textContent = all_assets[0].staked[index].rateperday.toFixed(4);
      rate.appendChild(ratesText);
      items.appendChild(rate);

      var bar = document.createElement('div');
      bar.className = "bar";

      let stkbtn = document.createElement('button');
      stkbtn.className = "unstkbtn";
      stkbtn.id = all_assets[0].staked[index].asset_id;
      stkbtn.onclick = async function s(){
      assetunstake(stkbtn.id);};

      bar.appendChild(stkbtn);
      div.appendChild(items);
      div.appendChild(bar);
      mainDiv.appendChild(div);
    }
    loader.display = "none";
    document.getElementById('staking').style.display = "block";
    mainDiv.style.display = "block";
}

async function returnbtn(){
  var result = window.getComputedStyle(document.getElementById('loader'), '').display;
  if(result != "block"){
    await clearUi();
    if(switchtoshop)
      shopPanel(true)
    else{
      document.getElementById("home").style.visibility = "visible";
      document.getElementById("team").style.display = "block";
      document.getElementById("story").style.display = "block";
      document.getElementById("whitepaper").style.display = "block";
      document.getElementById("switchpanel").style.display = "block";
      document.getElementById("switchpanel2").style.display = "block"; 
    }
  }
}

async function shopPanel(index){
  loader.display = "block";
  if(index){
    homescreen?homescreen=false:"";
    switchtoshop = false;
    document.getElementById('return').style.visibility = "visible";
    document.getElementById("team").style.display = "none";
    document.getElementById("story").style.display = "none";
    document.getElementById("whitepaper").style.display = "none";
    document.getElementById("switchpanel").style.display = "none";
    document.getElementById("switchpanel2").style.display = "none";
    document.getElementById("home").style.visibility = "hidden";
    document.getElementById("letsstake").src = "./assets/pupmarket.PNG";
    document.getElementById("letsstake").style.visibility = "visible";

    var packs = document.createElement('img');
    packs.className = 'shopPanelbtn';
    packs.src = "./assets/shopPanel_packs.PNG";
    packs.onclick = async function(){
      switchtoblends = false;
      switchshop(true);
    }

    var blends = document.createElement('img');
    blends.className = 'shopPanelbtn';
    blends.src = "./assets/shopPanel_blends.PNG";
    blends.onclick = async function(){
      switchtoblends = true;
      switchshop(true);
    }
    
    var market = document.createElement('img');
    market.className = 'shopPanelbtn';
    market.src = "./assets/shopPanel_market.PNG";
    market.onclick = async function(){
      window.open('https://neftyblocks.com/c/cryptopuppyz','_blank');
    }
    
    var marketAH = document.createElement('img');
    marketAH.className = 'shopPanelbtn';
    marketAH.src = "./assets/shopPanel_marketAH.PNG";
    marketAH.onclick = async function(){
      window.open('https://wax.atomichub.io/market?collection_name=cryptopuppyz&order=desc&sort=created&symbol=WAX','_blank');
    }

    var creatorSale = document.createElement('img');
    creatorSale.className = 'shopPanelbtn';
    creatorSale.src = "./assets/shopPanel_creatorSale.PNG";
    creatorSale.onclick = async function(){
      window.open('https://wax.atomichub.io/explorer/account/burb2.wam?collection_name=cryptopuppyz&order=desc&seller=burb2.wam&sort=created&state=0,1,4&symbol=WAX#listings','_blank');
    }

    var linebreak = document.createElement("br");

    shopPaneldiv = document.getElementById("shopPaneldiv");
    var table = document.createElement("div");
    table.className = "tablecontainerShop";
    table.appendChild(packs);
    table.appendChild(blends);
    table.appendChild(creatorSale);
    table.appendChild(linebreak);
    table.appendChild(market);
    table.appendChild(marketAH);
    shopPaneldiv.appendChild(table);
    loader.display = "none";
    shopPaneldiv.style.display = "block";

  }
}

async function switchshop(index) {
    if(!loggedIn){
      ShowToast("Please Login into your WAX Account");
      WalletListVisible(!0);
    }
    else{
      homescreen?homescreen=false:"";
      clearUi();
      document.getElementById("switchpanel").style.display = "none";
      document.getElementById("switchpanel2").style.display = "none";
      document.getElementById("home").style.visibility = "hidden";
      document.getElementById("team").style.display = "none";
      document.getElementById("story").style.display = "none";
      document.getElementById("whitepaper").style.display = "none";
      switchtoshop = index;
      await main();
    }
}

async function clearUi(){
  document.getElementById('staking').style.display = "none";
  document.getElementById("letsstake").style.visibility = "hidden";
  mainDiv.style.display = "none";
  var shopPaneldiv = document.getElementById("shopPaneldiv");
  shopPaneldiv.style.display="none";
  if(mainDiv.children.length >=1){
    var child = mainDiv.lastElementChild;
    while (child) {
      mainDiv.removeChild(child);
      child = mainDiv.lastElementChild;
    }
  }
  
  if(shopPaneldiv.children.length >=1){
    var child = shopPaneldiv.lastElementChild;
    while (child) {
      shopPaneldiv.removeChild(child);
      child = shopPaneldiv.lastElementChild;
    }
  }
}

function CustomInputChanged() {
  var element = document.getElementById("custominput");
  element.value = parseInt(element.value);
  var valid = element.value > 0;
  var timeMultiplier = GetTimeMultiplier();
  document.getElementById("customamount").innerHTML =
    (timeMultiplier * element.value) / config.Multiplier;
  document.getElementById("buy" + menuPrices.length).disabled = !valid;
}

function TimeInputChanged() {
  var textValue = document.getElementById("timeinput").value;
  if (textValue.length > 0) {
    var value = parseInt(textValue);
    if (value < 1) {
      value = 1;
    }
    document.getElementById("timeinput").value = value;
    document.getElementById("timeunit").innerHTML = value > 1 ? "days" : "day";
  }
  var oldCustom = document.getElementById("custominput").value;
  !homescreen?PopulateMenu():"";
  document.getElementById("custominput").value = oldCustom;
  CustomInputChanged();
}

function GetTimeMultiplier() {
  var textValue = document.getElementById("timeinput").value;
  if (textValue.length > 0) {
    var timeMultiplier = parseInt(textValue);
    if (timeMultiplier < 1) {
      timeMultiplier = 1;
    }
    return timeMultiplier;
  } else {
    return 1;
  }
}

function WalletListVisible(visible) {
  document.getElementById("walletlist").style.visibility = visible ?
    "visible" :
    "hidden";
}

function ShowMessage(message) {
  document.getElementById("messagecontent").innerHTML = message;
  document.getElementById("message").style.visibility = "visible";
}

function HideMessage(message) {
  document.getElementById("message").style.visibility = "hidden";
}



function CalcDecimals(quantity) {
  var dotPos = quantity.indexOf(".");
  var spacePos = quantity.indexOf(" ");
  if (dotPos != -1 && spacePos != -1) {
    return spacePos - dotPos - 1;
  }
  return 0;
}

async function GetFreeSpace() {
  for (var index = 0; index < pools.length; index++) {
    var path = "/v1/chain/get_table_rows";
    var data = JSON.stringify({
      json: true,
      code: "eosio.token",
      scope: pools[index].contract,
      table: "accounts",
      lower_bound: "WAX",
      upper_bound: "WAX",
      limit: 1,
    });
    const response = await fetch("https://" + endpoint + path, {
      headers: {
        "Content-Type": "text/plain"
      },
      body: data,
      method: "POST",
    });
    const body = await response.json();
    if (body.rows && Array.isArray(body.rows) && body.rows.length == 1) {
      pools[index].freeSpace = Math.floor(parseFloat(body.rows[0].balance));
      if (pools[index].contract == contract) {
        document.getElementById("freevalue").innerHTML =
          pools[index].name +
          ": " +
          pools[index].freeSpace +
          " WAX" +
          " available";
      }
    } else {
      ShowToast("Unexpected response retrieving balance");
    }
  }
}

function GetSymbol(quantity) {
  var spacePos = quantity.indexOf(" ");
  if (spacePos != -1) {
    return quantity.substr(spacePos + 1)
  }
  return ""
}

async function ShowToast(message) {
  var element = document.getElementById("toast");
  element.innerHTML = message;
  toastU = 0;
  var slideFrac = 0.05;
  var width = element.offsetWidth;
  var right = 16;
  var id = setInterval(frame, 1e3 / 60);
  element.style.right = -width + "px";
  element.style.visibility = "visible";

  function frame() {
    toastU += 0.005;
    if (toastU > 1) {
      clearInterval(id);
      element.style.visibility = "hidden";
    }
    p =
      toastU < slideFrac ?
      toastU / slideFrac / 2 :
      1 - toastU < slideFrac ?
      (1 - toastU) / slideFrac / 2 :
      0.5;
    element.style.right =
      (width + right) * Math.sin(p * Math.PI) - width + "px";
  }
}
async function autoLogin() {
  var isAutoLoginAvailable = await wallet_isAutoLoginAvailable();
  if (isAutoLoginAvailable) {
    login();
  }
}
async function selectWallet(walletType) {
  wallet_selectWallet(walletType);
  login();
}
async function logout() {
  await wallet_logout();
  clearUi();
  document.getElementById("loggedin").style.display = "none";
  document.getElementById("loggedout").style.display = "block";
  document.getElementById('staking').style.display = "none";
  document.getElementById('return').style.visibility = "hidden";
  returnbtn(); 
  loggedIn = false;
  HideMessage();
}
async function login() {
  try {
    if (!loggedIn) {
      const userAccount = await wallet_login();
      ShowToast("Logged in as: " + userAccount);
      document.getElementById("loggedout").style.display = "none";
      document.getElementById("loggedin").style.display = "block";
      document.getElementById('return').style.visibility = "visible";
      WalletListVisible(false);
      loggedIn = true;
      main();
    }
  } catch (e) {
    ShowToast(e.message);

  }
}
async function wallet_isAutoLoginAvailable() {
  var sessionList = await anchorLink.listSessions(dapp);
  if (sessionList && sessionList.length > 0) {
    useAnchor = true;
    return true;
  } else {
    useAnchor = false;
    return await wax.isAutoLoginAvailable();
  }
}


async function wallet_selectWallet(walletType) {
  useAnchor = walletType == "anchor";
}
async function wallet_login() {
  if (useAnchor) {
    var sessionList = await anchorLink.listSessions(dapp);
    if (sessionList && sessionList.length > 0) {
      wallet_session = await anchorLink.restoreSession(dapp);
    } else {
      wallet_session = (await anchorLink.login(dapp)).session;
    }
    wallet_userAccount = String(wallet_session.auth).split("@")[0];
    auth = String(wallet_session.auth).split("@")[1];
    anchorAuth = auth;

  } else {
    wallet_userAccount = await wax.login();
    wallet_session = wax.api;
    anchorAuth = "active";
  }
  return wallet_userAccount;
}
async function wallet_logout() {
  if (useAnchor) {
    await anchorLink.clearSessions(dapp);
  }
}
async function wallet_transact(actions) {
  if (useAnchor) {
    var result = await wallet_session.transact({
      actions: actions
    }, {
      blocksBehind: 3,
      expireSeconds: 30
    });
    result = {
      transaction_id: result.processed.id
    };
  } else {
    var result = await wallet_session.transact({
      actions: actions
    }, {
      blocksBehind: 3,
      expireSeconds: 30
    });
  }
  return result;
}