const bcrypt = require('bcryptjs');

const User = require('../../schema/models/User');
const Stat = require('../../schema/models/Stat');
const Connection = require('../../schema/models/Connection')
const Axios = require('axios');

const user = userId => {
    return User.findById(userId)
    .then( user => {
        return {...user._doc, _id: user.id, stats: stats.bind(this, user._doc.stats)}
    }).catch( err => {
        console.log('Error getting the User by ID: ', err);
        throw err;
    })
}

const stats = statIds => {
    return Stat.find({_id: {$in: statIds}})
    .then( stats => {
        return stats.map( stat => {
            return { ...stat._doc, _id: stat.id, holder: user.bind(this, stat.holder) }
        })
    }).catch( err => {
        console.log('Error getting the Stat by ID: ', err);
        throw err;
    })
}


module.exports = {
    stats: () => {
        return Stat.find().then(stats => {
            return stats.map( stat => {
                return {
                    ...stat._doc,
                     _id: stat.id,
                     holder: user.bind(this, stat._doc.holder) 
                };
            });
        }).catch(err => {
            console.log('Error fetching Stats: ', err);
            throw err;
        });
    },
    createUser: (args) => {
        return User.findOne({ $or: [{ email: args.userInput.email }, {username: args.userInput.username}]}).then( user => {
            if(user){
                throw new Error('User exists already');
            }
            return bcrypt.hash(args.userInput.password, 12)    
        })
        .then( hashedPassword => {
            console.log('Hashed Password: ', hashedPassword);
            const user = new User({
                email: args.userInput.email,
                password: hashedPassword,
                username: args.userInput.username,
                sport: args.userInput.sport,
                name: args.userInput.name,

            });
            return user.save();
        })
        .then( res => {
            return {...res._doc, _id: res.id};
        })
        .catch( err => {
            console.log('Error: ', err);
            throw err;
        })
    },
    createStat: (args) => {
        const stat = new Stat({
            name: args.statInput.name,
            description: args.statInput.description,
            value: args.statInput.value,
            holder: '5c72c7444af96d129ddc8017'
        });
        let createdStat; 
        return stat.save()
        .then(res => {
            console.log('Stat saved: ', stat);
            console.log('Saved Stat to Atlas: ', res);
            createdStat = {...res._doc, _id: res._doc._id.toString(), holder: user.bind(this, res._doc.holder) };
            return User.findById('5c72c7444af96d129ddc8017')
        }).then(user => {
            if(!user) {
                throw new Error('No User Found')
            }
            user.stats.push(stat);
            return user.save();
        })
        .then(res => {
            return createdStat;
        })
        .catch(err => {
            console.log('Stat: ', stat);
            console.log('Error saving to Atlas: ', err);
        });
    },
    syncFit: (args) => {
        // !!! Use the username provided to log that the user synced the Data into the History Object
        const fitSet = {};
        const timeNow = Date.now();
        console.log('Time in milliseconds: ', timeNow);
        
        // const apiKey = 
        return Axios.post(
            'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate/', {
                "aggregateBy": [{
                    "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
                }],
                "bucketByTime": { "durationMillis": 86400000 },
                "startTimeMillis": ((timeNow - (timeNow % 86400000)) - (86400000 * 29)) - ( 330 * 60 * 1000 ),
                "endTimeMillis": timeNow
            },{
                headers: {
                    "Authorization" : 'Bearer ' + args.syncFitInput.token.value
                }
            }
        ).then((res) => {
            var res = res.data;
            const stats = [];
            for( i = 0; i <= 29; i++ ){
                console.log('Data to be synced: ', res.bucket[i].dataset[0].point[0].value[0].intVal);
                let stat = new Stat({
                    name: 'Steps',
                    description: 'Steps Day: ' + ( 29 - i ) + ' were taken',
                    value: res.bucket[i].dataset[0].point[0].value[0].intVal
                })
                stats.push(stat);
                console.log('Stats: ', stats);
            }
            return stats;
            // return
            // createStat({statInput: {name: "Steps", description: "Steps For Last 30 Days", va}});
        },
        (error) => {
            var status = error
            console.log('Error Getting Steps Data from Google Fit: ', status);
        });
    }
    
    // createConnection: (args) => {
    //     const connection = new Connection({

    //     })
    // }
}