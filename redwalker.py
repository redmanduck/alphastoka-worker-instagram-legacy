import requests, re
from bs4 import BeautifulSoup
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()
channel.queue_declare(queue='redwalker')

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
        return str(self.soup.select(".country-inline")[0].text.strip())

    def getAllChannelRef(self):
        stx = str(self.soup)
        rgx_reflink = r"\"(/user/[^\"]*)\""
        m1 = re.findall(rgx_reflink, stx)
        rgx_reflink = r"\"(/channel/[^\"]*)\""
        m2 = re.findall(rgx_reflink, stx)

        M = []
        for m in m1+m2:
            k = m.split("/")
            M.append(k[2])
        return M

    def getEmail(self):
        descriptionSection = self.getDescription()
        rgx_email = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
        m = re.search(rgx_email, descriptionSection)
        return m.group(0)

def parseChannelByIdOrUser(idOrUser):
    baseUri = "https://www.youtube.com/user/"
    #determine base url /user or /channel
    r = requests.get(baseUri + idOrUser)
    if(r.status_code != 200):
        baseUri = "https://www.youtube.com/channel/"
    return parseChannelByUrl(baseUri + idOrUser + "/about")

def parseChannelByUrl(url):
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
    data['ref'] = brain.getAllChannelRef()

    # linkQ = linkQ + data['ref']
    channel.basic_publish(exchange='',
                      routing_key='hello',
                      body='Hello World!')

    return data


linkQ  = ["UCO5rwjHY-jcX-gmzOCSApOQ"]
while len(linkQ) > 0:
    q = linkQ.pop()
    x = parseChannelByIdOrUser(q)
    print(x)

connection.close()
