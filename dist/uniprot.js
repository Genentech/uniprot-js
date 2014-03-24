/**
 * A uniprot .dat format parser
 *
 *
 * Copyright (c) 2014, Genentech Inc.
 * @author masselot.alexandre@gene.com, Genentech 2013
 */
( function(root) {
    //
    'use strict';
    if (root.Uniprot === undefined) {
        root.Uniprot = {};
    }

    (function(){
        var UniprotReader = function() {

        };
        /**
         * split the text content into individual dat uniprot entries
         */
        UniprotReader.prototype.datEntries = function(contents) {
            var reEnd = /^\/\//;

            var ret = [];
            var cur = '';
            contents.split("\n").forEach(function(line) {
                if (reEnd.test(line)) {
                    ret.push(cur);
                    cur = '';
                    return;
                }
                cur += line + "\n";
            });

            //add the last on if file does not end with //
            if (cur.trim() !== '') {
                ret.push(cur);
            }

            return ret;
        };
        /**
         * build the so called "canonical" entry. That might not be the most relevant thing to do but that's rather classic.
         * http://www.uniprot.org/faq/30
         * @param {String|Object} contents the dat text contents or the groupByField Map
         * @param {Object} options
         */
        UniprotReader.prototype.buildCanonicalEntry = function(contents) {
            var self = this;
            var attrs = (contents === Object(contents)) ? contents : self.groupByField(contents);
            return {
                id : entryMapTo.id(attrs),
                accessionCodes : entryMapTo.accessionCodes(attrs),
                OS : entryMapTo.OS(attrs),
                OC : entryMapTo.OC(attrs),
                sequence : entryMapTo.sequence(attrs),
                ncbi_taxid : entryMapTo.ncbi_taxid(attrs),
                xrefs : entryMapTo.xrefs(attrs)
            };
        };
        /**
         * build the list of isoforms from this entry.
         * id will be the isoId, but synomyms AC could be appended
         * @param {String|Object} contents the dat text contents or the groupByField Map
         * @param {Object} options
         */
        UniprotReader.prototype.buildIsoformEntries = function(contents) {
            var self = this;
            var attrs = (contents === Object(contents)) ? contents : self.groupByField(contents);

            var isoDescr = isoformDescriptions(attrs);

            if (isoDescr === undefined) {
                isoDescr = [{
                    id : entryMapTo.id(attrs),
                    vsps : []
                }];
            }

            //assemble FT VAR_SEQ by FTId -> feature obj
            var ftVarseq = {};
            entryMapTo.features(attrs).filter(function(ft) {
                return ft.type == 'VAR_SEQ';
            }).forEach(function(ft) {
                    if (ft.id === undefined) {
                        throw {
                            error : 'no FTId for ft ' + ft.comment + ' in ' + attrs.ID
                        };
                    }
                    ftVarseq[ft.id] = ft;

                    if (ft.comment.indexOf('Missing') === 0) {
                        ft.replacedBy = '';
                    } else {
                        var m = /^([A-Z\s]+) \-> ([A-Z\s]+)/.exec(ft.comment);
                        if (m) {
                            ft.replacedBy = m[2].replace(/\s+/g, '');
                        } else {
                            throw {
                                error : 'cannot parse replacement sequence in ' + ft.comment + ' in ' + attrs.ID
                            };
                        }
                    }
                });

            return isoDescr.map(function(isod) {
                try {
                    var entryId = entryMapTo.id(attrs);
                    var isoId = isod.id;

                    var isoform = {
                        isoformOf : entryId,
                        OS : entryMapTo.OS(attrs),
                        OC : entryMapTo.OC(attrs),
                        ncbi_taxid : entryMapTo.ncbi_taxid(attrs)
                    };
                    if ((isod.vsps.length === 0) || (isoId == entryId)) {
                        isoform.isCanonical = true;
                    }

                    if (isod.vsps.length === 0) {
                        //we use the canonical entry id + add the isoform id in the acession codes
                        isoform.id = entryId;
                        isoform.accessionCodes = entryMapTo.accessionCodes(attrs).concat([entryId, isoId]);
                    } else {
                        isoform.id = isoId;
                        isoform.accessionCodes = [isoId];
                    }
                    isoform.sequence = self.applyFeaturesVSP(entryMapTo.sequence(attrs), isod.vsps.map(function(ftId) {
                        if (ftVarseq[ftId] === undefined) {
                            var message = isoId + " no VSP feature defined for " + ftId + ' (skipping isoform)';
                            console.error(message);
                            throw {
                                err : message
                            };
                        }
                        return ftVarseq[ftId];
                    }));
                    return isoform;
                } catch(e) {
                    console.error(e);
                    return undefined;
                }
            }).filter(function(iso) {
                    return iso !== undefined;
                });

        };

        UniprotReader.prototype.applyFeaturesVSP = function(sequence, vsps) {
            var retSeq = sequence;
            vsps.sort(function(a, b) {
                return b.start - a.start;
            }).forEach(function(vsp) {
                    retSeq = retSeq.substring(0, vsp.start) + vsp.replacedBy + retSeq.substring(vsp.end + 1);
                });
            return retSeq;
        };
        /**
         * from a text entry, group the content by descr field (the first two letter)
         * return a map descr -> text (with line separator)
         *
         * a field 'sequence' get the full length sequence (no trim)
         * @param {text} one entry text content
         */
        UniprotReader.prototype.groupByField = function(contents) {
            var reField = /^([A-Z][A-Z])   (.*)/;
            var reSeq = /^     ([A-Z ]+)$/;
            var seq = '';
            var ret = {};
            contents.split("\n").forEach(function(line) {
                var m = reField.exec(line);
                if (m) {
                    var k = m[1];
                    var txt = m[2];
                    if (ret[k] === undefined) {
                        ret[k] = '';
                    } else {
                        ret[k] += "\n";
                    }
                    ret[k] += txt;
                    return;
                }
                m = reSeq.exec(line);
                if (m) {
                    seq += m[1].replace(/\s+/g, '');
                }
            });
            ret.sequence = seq;
            return ret;
        };
        /**
         * return just one structure name field (accessionCodes, id, ccs et.c)
         * @param {Object} contents
         * @param {Object} fieldName
         */
        UniprotReader.prototype.getField = function(contents, fieldName) {
            return entryMapTo[fieldName](this.groupByField(contents));
        };
        //private function to build field based to the groupByField function
        var entryMapTo = {
            id : function(m) {
                return m.ID.split(' ')[0];
            },
            accessionCodes : function(attrs) {
                return attrs.AC.split(/[\s;]+/).filter(function(n) {
                    return n.trim() !== '';
                });
            },
            OS : function(m) {
                return m.OS.replace(/\.\s*$/, '');
            },
            OC : function(attrs) {
                return attrs.OC.replace(/\.\s*$/, '').split(/;\s*/).filter(function(n) {
                    return n.trim() !== '';
                });
            },
            sequence : function(attrs) {
                return attrs.sequence;
            },
            ncbi_taxid : function(attrs) {
                var s = attrs.OX;
                var re = /^NCBI_TaxID=(\d*);$/;
                var m = re.exec(s);
                if (!m) {
                    throw attrs.ID + ": cannot extract ncbi_taxid from[" + s + "]";
                }
                return parseInt(m[1], 10);
            },
            //return CC lines, grouped by -!-
            // is onlye one is present, we have a string, if multiples, it start to bean array
            cces : function(attrs) {
                var ret = {};
                ("\n" + attrs.CC).split("\n-!- ").forEach(function(t) {
                    var i = t.indexOf(':');
                    var k = t.substr(0, i);
                    var cont = t.substr(i + 2).trim().replace(/^\s+/, '');
                    if (ret[k] === undefined) {
                        ret[k] = cont;
                    } else if (ret[k].substring) {//there was only a single string
                        ret[k] = [ret[k], cont];
                    } else {//there was already an array
                        ret[k].push(cont);
                    }
                });
                return ret;
            },
            //an arry of features, each of them a map {tpye:, start:, end:, comment:}
            //multilines comments are wrapped around
            features : function(attrs) {
                var ret = [];
                //we skip feature with position ?, >, <
                var re = /(\w+)\s+(\d+)\s+(\d+)\s*(.*)/;
                var curft;
                attrs.FT.split("\n").forEach(function(line) {
                    //console.log(line)
                    var m = re.exec(line);
                    if (m) {
                        curft = {
                            type : m[1],
                            start : parseInt(m[2], 10) - 1,
                            end : parseInt(m[3], 10) - 1,
                            comment : m[4]
                        };
                        ret.push(curft);
                    } else {
                        if (curft) {
                            curft.comment += ' ' + line.replace(/^\s+/, '');
                        }
                    }
                });
                ret.forEach(function(ft) {
                    var m = /\/FTId=(\w+)\.$/.exec(ft.comment);
                    if (m) {
                        ft.id = m[1];
                    }
                });
                return ret;
            },
            xrefs : function(attrs) {
                var pdbs = attrs.DR.split('\n').map(function(l) {
                    return l.replace(/\.$/, '').split('; ');
                }).filter(function(la) {
                        return la[0] === 'PDB';
                    }).map(function(la) {
                        return {
                            id : la[1],
                            method : la[2],
                            resolution : la[3],
                            chains : la[4].split(', ').map(function(tk) {
                                var m = /(.*)=(\d+)\-(\d+)/.exec(tk);
                                if (!m) {
                                    return undefined;
                                }
                                return {
                                    name : m[1],
                                    start : m[2] - 1,
                                    end : m[3] - 1
                                };
                            }).filter(function(c) {
                                    return c !== undefined;
                                })
                        };
                    });

                return {
                    PDB : pdbs
                };
            }
        };

        /*
         * build a list of isoform descriptions
         * an array of maps with :
         * id ->
         * vsps -> the list of VSP_ to be aplied
         * @param {Object} attrs
         *
         * the next step will be to locate the VSP FT's and apply them
         */
        var isoformDescriptions = function(attrs) {
            var aaAlts = entryMapTo.cces(attrs)['ALTERNATIVE PRODUCTS'];
            if (aaAlts === undefined) {
                return undefined;
            }

            var re = / IsoId=(\S+); Sequence=([\s\S]*?);/g;
            var ret = [];
            var m;
            while ((m = re.exec(aaAlts))) {
                if (/External|Not described/.test(m[2])) {
                    continue;
                }
                var vsps = m[2].split(/,\s*/);
                if (vsps.length == 1 && vsps[0] == 'Displayed') {
                    vsps = [];
                }
                ret.push({
                    id : m[1],
                    vsps : vsps
                });
            }
            return ret;
        };

        //node.js compatibility
        if ( typeof exports !== 'undefined') {
            exports.Reader = UniprotReader;
        }

        root.Uniprot.Reader = UniprotReader;
    }());

}(this));