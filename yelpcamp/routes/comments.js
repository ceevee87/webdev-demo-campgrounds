var express    = require('express'),
    auth       = require('../middlewares/auth'),
    router     = express.Router({mergeParams:true});

var mongoose = require('mongoose');

var ensureAuthenticated   = auth.ensureAuthenticated,
    checkCommentOwnership = auth.checkCommentOwnership;

var Campground = require('../models/campground.model');
var Comment    = require('../models/comment.model');

// ===============================================
// ******       COMMENTS ROUTES          *********
// ===============================================
// RESTful routes for campground comments
// NEW     /campgrounds/:id/comments/new  GET
// CREATE  /campgrounds/:id/comments      POST

// INDEX    N/A
// SHOW     N/A
 
// EDIT    /campgrounds/:id/comments/:comment_id/edit
// UPDATE  /campgrounds/:id/comments/:comment_id
// DESTROY /campgrounds/:id/comments/:comment_id


// comments NEW
router.get('/new', ensureAuthenticated, function(req, res) {
    Campground.findById(req.params.id, function(err, campground){
        if (err) {
            console.error("/campground/:id/comments/new - could not findById: "+err);
        } else {
            res.render('comment.new.ejs', {campground: campground});
        }
    });
});

// comments CREATE (post)
router.post('/', ensureAuthenticated, function(req, res) {
    Campground.findById(req.params.id, function(err, campground){
        if (err) {
            req.flash("error", "Could not find campground with id: "+req.params.id);        
            res.redirect('/');
        } else {
            var newComment             = new Comment();
            newComment.text            = req.body.comment.text;
            newComment.createdAt       = new Date(),
            newComment.author.id       = req.user._id;
            newComment.author.username = req.user.username;
            Comment.create(newComment, function(err2, _comment) {
                if (err2) {
                    req.flash("error", "Could not create new comment: "+err2);        
                } else {
                    campground.comments.push(_comment._id);
                    campground.save();
                }
            });
            res.redirect('/campgrounds/' + campground._id);
        }
    });
});

// comments EDIT 
router.get('/:comment_id/edit', checkCommentOwnership, function(req, res) {
    Comment.findById(req.params.comment_id, function(err, comment){
        if (err) {
            req.flash("error", "Could not find comment: "+err.message);
            console.error("lookup comment: could not findById: "+err);
        } else {
            res.render('comment.edit.ejs', {campground_id: req.params.id, comment: comment});
        }
    });
});

// comments UPDATE (put)
router.put('/:comment_id', checkCommentOwnership, function(req, res) {
    // res.send("Caught update comment route. Updated comment = \n"+JSON.stringify(req.body.comment));
    var newComment = req.body.comment;
    newComment.createdAt = new Date();
    Comment.findByIdAndUpdate(req.params.comment_id, newComment,  {new: true}, function(err, resComment){
        if (err) {
            req.flash("error", "Could not update comment: "+err.message);
        } else {
            if (req.xhr) {
                res.json(resComment);
            } else {
                res.redirect('/campgrounds/' + req.params.id);
            }
        }
    });
});

// comments DESTOY (delete)
router.delete('/:comment_id', checkCommentOwnership, function(req, res) {
    // what about references to this comment in the campgrounds collection? 
    // Each campground document contains an array of comments.
    // when we delete a comment we have to remove it from the comments 
    // collection AND the array of comment referece IDs in a campground 
    // document. 
    // the lengthy code below does that. First we remove the comment ID from
    // the campground array then go on to remove the comment itself from the
    // comment collection.
    Campground.update({'_id': req.params.id}, { $pullAll: {'comments': [req.params.comment_id]}}, function(err, data) {
        if (err) {
            if (req.xhr) {
                res.json(data);
            } else {
                req.flash("error", "Could not find or delete comment from campground list." + err.message);
                res.redirect('/campgrounds/' + req.params.id);
            }
        } else {
            Comment.findByIdAndRemove(req.params.comment_id, function(err, delcomment){
                if (err) {
                    if (req.xhr) {
                        res.json(data);
                    } else {
                        req.flash("error", "Could not remove comment: "+err.message);
                        res.redirect('/campgrounds/' + req.params.id);
                    }
                } else {
                    // I implemented 'in-place' deletes using ajax because it makes
                    // things a lot smoother looking on the web page. I don't get a
                    // screen refresh--the comment just goes away. So, I had to account
                    // for an ajax request type in this version. I leave the old server
                    // side code in (the else clause) just so I can see it for reference
                    // purposes.
                    if (req.xhr) {
                        res.json(delcomment);
                    } else {
                        res.redirect('/campgrounds/' + req.params.id);
                    }
                }
            });
        }
    });
});

module.exports = router;