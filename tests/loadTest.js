module.exports = {
    function : (userContext, events, done) => {
        userContext.vars.$randomString = ( ) => Math.random().toString(36).substring(2)
        userContext.vars.$randomNumber = (min, max) =>  Math.floor(Math.random() * (max - min + 1)) + min;
        return done();
    }
}