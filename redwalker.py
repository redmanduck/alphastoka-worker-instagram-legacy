import requests, re
from bs4 import BeautifulSoup
import pika

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
        return
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
        'follower_count': -1
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
    dnode = brain.getAllChannelRef()
    for x in dnode:
        linkQ.append(x)
    
    return data


visited = {}
linkQ  = ["UCO5rwjHY-jcX-gmzOCSApOQ"]
result = []
while True:
    if len(linkQ) == 0:
        break
    q = linkQ.pop()
    try:
        x = parseChannelByIdOrUser(q, linkQ, visited)
        result.append(x)
    except Exception as ex:
        print("No required field")
