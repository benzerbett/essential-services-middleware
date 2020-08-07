let express = require('express') 
let cors  = require('cors');
let compression  = require('compression');
let helmet  = require('helmet');
let morgan  = require('morgan');
require('isomorphic-unfetch');
let apicache = require('apicache');
let dotenv = require('dotenv').config();
let path = require('path');

let cache = apicache.middleware
let PORT = process.env.APP_PORT || 3000

let app = express();
app.use(cors());
app.use(compression());
app.use(helmet());
app.use(morgan('dev')); //FORMATS: //combined //tiny, common, short, dev
const onlyStatus200 = (req, res) => {       //only cache successful requests greater than 400 bytes
     if(res.statusCode === 200 && res.get('Content-Length') > 400){
        console.log(`will be cached...`);
        return true 
    }else{
        return false 
    } 
}
app.use(cache('3 days', onlyStatus200)); // works brilliantly. // LocalForage would be an alternative that supports IndexedDB


app.get('/', async(req, res) => {
    // let docs = getApiDocs(app._router)
    // res.json(docs)
    res.redirect('/request/null')
});

app.get('/request/:url', async (req, res) => {
    let {url} = req.params
    if(!url || url.length < 5 ){
         res.json({error: true, msg:"Invalid URL given"});
    }
    let decoded_url = Buffer.from(url, 'base64').toString('ascii')
    try {
        let sc = await justFetch(decoded_url)
        res.json(sc)
    } catch (er) {
        res.json({error: true, msg: er.message})
    }
});



let justFetch = async (endpoint, postoptions) => {
    if (endpoint == null || endpoint.length < 4) {
      return { error: true, type: 'url', message: 'Invalid endpoint URL' };
    }
    let options = postoptions || {};
    let req_method = options.method || 'GET'; //PUT //POST //DELETE etc.
    let req_hd = {};
    let headers = {};
    if (process.env.APP_ENV == 'dev' || process.env.APP_ENV == 'development') {
      headers.authorization =
        'Basic ' +
        Buffer.from(process.env.DHIS_USERNAME + ':' + process.env.DHIS_PASSWORD).toString('base64');
    }
    req_hd.headers = headers;
    req_hd.method = req_method;
    //body for POST/PUT requests
    if (req_method != 'GET') {
      req_hd.body = JSON.stringify(options.body); //Stringify here, not in source
    }
    //body for POST/PUT requests
  
    try {
      let result = await fetch(endpoint, req_hd);
      let result_json = await result.json();
      if (result_json.status === 'ERROR') {
        throw result_json;
      }
      return result_json;
    } catch (err) {
      return { error: true, ...err };
    }
};


//error handling (should really use module)
app.use(function (err, req, res, next) {
    res.status(404).json({error: true, message: "An error occured"})
    console.log("Error: "+err)
})
//error handling

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});
