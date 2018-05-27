    let csv = require('fast-csv');
    let fs = require('fs');
fs.createReadStream("my.csv")
    .pipe(csv())
    .on("data", function(data){
        console.log(data);
    })
    .on("end", function(){
        console.log("done");
    });
