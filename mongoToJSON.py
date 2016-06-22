import json

f = open("raw.json", "r")

L = []
seen = {}
x = 0
for a in f:
    x = x + 1
    o = json.loads(a)
    # check seen
    if o['user']['username'] in seen:
        continue

    seen[o['user']['username']] = True;
    del o['_id']
    L.append(o)

js = json.dumps(L, ensure_ascii=False, encoding='utf8')
j8 = js.encode('utf-8')
f.close()
fo = open("collection.json" , "w")
fo.write(j8)
fo.close()

print "record after clean", len(L) , "/" , x
