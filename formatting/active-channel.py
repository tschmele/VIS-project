# directory handling imports
from os import listdir
from os.path import isfile, join

# work imports
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone

# utility imports
from timebudget import timebudget
import ray
from itertools import tee, islice, chain
from collections import Counter

print('starting setup')

folder = 'data/discord/matrix-prep/'
target = 'data/discord/matrix-data/'

file_names = [f for f in listdir(folder) if isfile(join(folder, f))]
stream_file = 'data/stream/streams.csv'
chunk_size = 100000

def previousAndNext(some_iterable):
    prevs, items, nexts = tee(some_iterable, 3)
    prevs = chain([None], prevs)
    nexts = chain(islice(nexts, 1, None), [None])
    return zip(prevs, items, nexts)

def parseTime(t:str):
    for fmt in ('%Y-%m-%d %H:%M:%S.%f%z', '%Y-%m-%d %H:%M:%S%z'):
        try:
            return datetime.strptime(t, fmt)
        except ValueError:
            pass
    raise ValueError('another weird format detected')

# --- --- todo list
# --- step 1
# sort by author
# bin by time (full hour +- 30min)
# find most active channel per user
# --- step 2
# find out movements per user
# group movements by time and channel
# save to file

def setupStreams(stream, index, date, duration):
    start = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%f%z')
    end = start + timedelta(milliseconds=duration)
    topic = stream.split(':')
    return {
        'topic': ' -'.join(topic),
        'index': int(index) - 1,
        'start': datetime(start.year, start.month, start.day, start.hour, tzinfo=timezone.utc) - timedelta(hours=1),
        'end': datetime(end.year, end.month, end.day, end.hour, tzinfo=timezone.utc) + timedelta(hours=3)
    }

def mapMovement(bin, nxt):
    return {
        't0': bin['time'],
        't1': nxt['time'],
        'c1': bin['main_channel'],
        'c2': nxt['main_channel']
    }

@ray.remote
def handleFile(filename:str, stream:object):
    content = pd.read_csv(folder + filename, chunksize=chunk_size)
    # print(f'opened "{filename}"')
    content = pd.concat(content)

    # --- step 1
    # sort by author
    content.sort_values(by=['author'], inplace=True)
    by_authors = []
    [by_authors.append({'author':a, 'messages':[]}) for a in content['author'] if {'author':a, 'messages':[]} not in by_authors]

    for author in by_authors:
        author['messages'] = [{'date':parseTime(row[1]), 'channel':row[2]} for row in zip(content['author'], content['date'], content['channel']) if author['author'] == row[0]]

    # bin by time (full hour +- 30min)
    timestamps = np.arange(stream['start'], stream['end'], timedelta(hours=1)).astype(datetime)
    for i in range(len(timestamps)):
        timestamps[i] = timestamps[i].replace(tzinfo=timezone.utc)

    for author in by_authors:
        author['bins'] = []
        [author['bins'].append({'time':t, 'main_channel':'', 'channels':[]}) for t in timestamps]
        for bin in author['bins']:
            [bin['channels'].append(m['channel']) for m in author['messages'] if (bin['time'] - timedelta(minutes=30)) <= m['date'] and m['date'] < (bin['time'] + timedelta(minutes=30))]
            
            # find most active channel per user
            if (bin['channels'] != []):
                bin['main_channel'] = max(bin['channels'], key=bin['channels'].count)
            else:
                bin['main_channel'] = None
    
    # --- step 2
    # find movements per user
    for author in by_authors:
        author['movement'] = [mapMovement(bin, nxt) for prev, bin, nxt in previousAndNext(author['bins']) if nxt is not None]

    # group movement by time and channel
    all_movements = []
    for a in by_authors:
        [all_movements.append(m) for m in a['movement']]
    summed_movements = []
    [summed_movements.append(movement) for movement in all_movements if movement not in summed_movements]
    for movement in summed_movements:
        movement['sum'] = all_movements.count(movement)
    
    # save to file
    df = pd.DataFrame.from_records(summed_movements)
    df.sort_values(by=['t0', 't1', 'c1', 'sum', 'c2'], ignore_index=True, inplace=True)
    df.to_csv(target + filename, index=False)

    # print(f'finished "{filename}"')

@timebudget
def runAllFiles(t_list):
    ray.get([handleFile.remote(t['file'], t['stream']) for t in t_list])

# ----------------------------

streams = pd.read_csv(stream_file)
formatted_streams = [setupStreams(row[0], row[1], row[2], row[3]) for row in zip(streams['Stream'], streams['Index'], streams['Date'], streams['Duration'])]

topics = []
for file in file_names:
    topic = file.split('.')
    topic.pop()
    if (len(topic) > 1):
        topic = '.'.join(topic)
    else:
        topic = topic[0]
    
    topic = topic.split(' ')
    index = int(topic[len(topic) - 1])
    topic.pop()
    topic = ' '.join(topic)
    topics.append({
        'file': file,
        'topic': topic,
        'index': index
    })

for topic in topics:
    topic['stream'] = [s for s in formatted_streams if s['topic'] == topic['topic'] and s['index'] == topic['index']][0]

ray.init()

runAllFiles(topics)

ray.shutdown()