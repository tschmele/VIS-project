from os import listdir
from os.path import isfile, join

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone

from timebudget import timebudget
import ray

print('starting setup')

folder = 'data/discord/individual_channels/'
target = 'data/discord/matrix-prep/'

file_names = [f for f in listdir(folder) if isfile(join(folder, f))]
stream_file = 'data/stream/streams.csv'
chunk_size = 100000

keys = []
for file in file_names:
    splits = file.split(' - ')
    category = splits[0]
    channel = splits[1].split(' ')
    channel.pop()
    keys.append(category + '/' + '-'.join(channel))

# -------------------------------------------------------------------- #

print('setup complete\n')

streams = pd.read_csv(stream_file)

def setupStreams(stream, index, date, duration):
    start = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%f%z')
    end = start + timedelta(milliseconds=duration)
    topic = stream.split(':')
    return {
        'topic': ' -'.join(topic),
        'index': index - 1,
        'start': datetime(start.year, start.month, start.day, start.hour, tzinfo=timezone.utc) - timedelta(hours=1),
        'end': datetime(end.year, end.month, end.day, end.hour, tzinfo=timezone.utc) + timedelta(hours=3),
        'messages': []
    }

def filterMessages(author, date, start, end, channel):
    date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%f0%z')
    if (start <= date and date <= end):
        return {
            'author': author,
            'date': date,
            'channel': channel
        }

@ray.remote
def enterMessages(matrix, content, index):
    matrix['messages'] = np.concat((matrix['messages'], [filterMessages(row[0], row[1], matrix['start'], matrix['end'], keys[index]) for row in zip(content['Author'], content['Date']) if filterMessages(row[0], row[1], matrix['start'], matrix['end'], keys[index]) != None]))
    return matrix

@timebudget
def readFiles(files):
    matrices = [setupStreams(row[0], row[1], row[2], row[3]) for row in zip(streams['Stream'], streams['Index'], streams['Date'], streams['Duration'])]
    
    file_i = 0
    for file in files:
        content = pd.read_csv(folder+file, usecols=['Author', 'Date'], chunksize=chunk_size)
        print(f'opened "{file}"')
        content = pd.concat(content)

        content_id = ray.put(content)
        res = ray.get([enterMessages.remote(m, content_id, file_i) for m in matrices])
        matrices = res

        file_i += 1
    
    for m in matrices:
        df = pd.DataFrame.from_records(m['messages'])
        df.to_csv(target + m['topic'] + ' ' + str(m['index']) + '.csv', index=False)

ray.init()

readFiles(file_names)

ray.shutdown()