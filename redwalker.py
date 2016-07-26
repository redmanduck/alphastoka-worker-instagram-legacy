import requests, re
from bs4 import BeautifulSoup
import pika
import queue
MLAB_API_KEY = "ucQuRaICqjzsxmtTVyuXp3dxzNheiKmy";
MLAB_TEMP_COLLECTION = "raw_redwalker"

#connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
#channel = connection.channel()
#channel.queue_declare(queue='redwalker', durable=True)

class RedBrain:

    def __init__(self, soup):
        self.soup = soup

    def inThailand(self):
        return true

    def getDescription(self):
        return str(self.soup.select(".about-description")[0].text)

    def getTitle(self):
        return str(self.soup.select(".qualified-channel-title-text a")[0].text)

    def getCountry(self):
        try:
            return str(self.soup.select(".country-inline")[0].text.strip())
        except Exception:
            return ""

    def getFollowerAndViewCount(self):
        try:
            raw = str(self.soup.select(".about-stats")[0].text.strip())
            m = re.findall(r'([0-9,]+) (views|subscribers)', raw)
            return m
        except Exception as ex:
            return ""

    def getAllChannelRef(self):
        stx = str(self.soup)
        rgx_reflink = r"\"(/user/[^\"]*)\""
        m1 = re.findall(rgx_reflink, stx)
        rgx_reflink = r"\"(/channel/[^\"]*)\""
        m2 = re.findall(rgx_reflink, stx)
        mx = []

        if m1 is not None:
            mx = mx + m1
        if m2 is not None:
            mx = mx + m2

        M = []

        for m in mx:
            k = m.split("/")
            M.append(k[2])
        return M

    def getEmail(self):
        descriptionSection = self.getDescription()
        rgx_email = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
        m = re.search(rgx_email, descriptionSection)
        if m is None:
            return ''
        return m.group(0)

def parseChannelByIdOrUser(idOrUser, linkQ, visited):
    if idOrUser in visited:
        raise Exception("Seen this before: " +  idOrUser)
    baseUri = "https://www.youtube.com/user/"
    #determine base url /user or /channel
    r = requests.get(baseUri + idOrUser)
    if(r.status_code != 200):
        baseUri = "https://www.youtube.com/channel/"
    visited[idOrUser] = True
    return parseChannelByUrl(baseUri + idOrUser + "/about", linkQ, visited)

def parseChannelByUrl(url, linkQ, visited):
    print("Walking to", url)
    data = {
        'email': '',
        'country': '',
        'category': '',
        'phone': '',
        'title': '',
        'subscriber_count': -1,
        'view_count': -1
    }
    r = requests.get(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
    }, cookies={
        'PREF': 'f1=50000000&f5=30&hl=en-US'
    })
    raw = r.text
    soup = BeautifulSoup(raw, 'html.parser')
    brain = RedBrain(soup)
    #parse
    data['title'] = brain.getTitle()
    data['email'] = brain.getEmail()
    data['country'] = brain.getCountry()
    fvc = brain.getFollowerAndViewCount()
    data['subscriber_count'] = fvc[0][0].replace(",", "")
    data['view_count'] = fvc[1][0].replace(",", "")

    dnode = brain.getAllChannelRef()
    for xk in dnode:
        linkQ.put(xk)

    return data


visited = {}
linkQ  = queue.Queue()
linkQ.put("UCO5rwjHY-jcX-gmzOCSApOQ")
linkQ.put("HEARTROCKERChannel")
linkQ.put("FoodTravelTVChannel")
linkQ.put("UCQ0-okjX18v85QlCAr1GBwQ")
linkQ.put("easycooking")
linkQ.put("VrzoChannel")
linkQ.put("GGTKcastation")
linkQ.put("bomberball")
linkQ.put("UC0TnoMtL2J9OsXU4jgvO_ag")
linkQ.put("UClshsyv7mLwBxLLfSSwLAFQ")
linkQ.put("llookatgreeeen")
linkQ.put("faharisara")
linkQ.put("akaradet")

# result = []
while True:
    q = linkQ.get()
    try:
        x = parseChannelByIdOrUser(q, linkQ, visited)
        # result.append(x)
        # print("x=", q, x)
        print("Remaining in Q", linkQ.qsize())
        mongoUri = "https://api.mlab.com/api/1/databases/alphastoka/collections/" + MLAB_TEMP_COLLECTION + "/?apiKey=" + MLAB_API_KEY
        r=  requests.post(mongoUri, headers={
            "content-type" : "application/json"
            }, data=x)
        print(r.status_code)
    except Exception as ex:
        print(ex)
