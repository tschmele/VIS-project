# what we want to create :
# Date, Catergory1-Channel1, Category1-Channel2, ...
# 2022-01-01, 4839, 283, ...
# 2022-01-02, 3849, 390, ...
# ...
# 
# alternative :
# x0, x1, category1-channel1, catergory1-channel2, ...
# 2022-01-01, 2022-01-03, ...
# 2022-01-03, 2022-03-10, ...
# ...

from os import listdir
from os.path import isfile, join

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone

print('starting setup')

folder = 'data/discord/'
target = 'data/discord/prepared/'

files = [f for f in listdir(folder) if isfile(join(folder, f))]
chunk_size = 100000

days = np.arange(datetime(2022, 1, 1), datetime(2024, 1, 1), timedelta(days=1)).astype(datetime)
for i in range(len(days)):
    days [i] = days[i].replace(tzinfo=timezone.utc)

weeks = np.arange(datetime(2022, 1, 2), datetime(2023, 12, 30), timedelta(weeks=1)).astype(datetime)
weeks = np.insert(weeks, 0, datetime(2022, 1, 1))
for i in range(len(weeks)):
    weeks [i] = weeks[i].replace(tzinfo=timezone.utc)

keys = ['Date']
for file in files:
    splits = file.split(' - ')
    category = splits[0]
    channel = splits[1].split(' ')
    channel.pop()
    keys.append(category + '/' + '-'.join(channel))

day_bins = pd.DataFrame({
    'Date': days
}, columns=keys)

week_bins = pd.DataFrame({
    'Date': weeks
}, columns=keys)

for key in keys:
    if (key != 'Date'):
        i = 0
        for row in day_bins[key]:
            day_bins.loc[i, key] = 0
            i += 1
        i = 0
        for row in week_bins[key]:
            week_bins.loc[i, key] = 0
            i += 1

print('setup complete\n')
start = datetime.now()

file_i = 0
for file in files:
    content = pd.read_csv(folder+file, usecols=['Date', 'Reactions'], chunksize=chunk_size)
    print(f'opened "{file}"')

    content_i = 0
    days_i = 0
    weeks_i = 0
    chunk_i = 0
    for chunk in content:
        timestamp = datetime.now()
        for msg in chunk['Date']:
            date = datetime.strptime(msg, '%Y-%m-%dT%H:%M:%S.%f0%z')
            for i in range(days_i, len(day_bins)):
                if (i+1 == len(day_bins) and day_bins.loc[i, 'Date'] <= date):
                    day_bins.loc[i, keys[file_i+1]] += chunk.loc[content_i, 'Reactions'] + 1
                    break
                elif (day_bins.loc[i, 'Date'] <= date and date < day_bins.loc[i+1, 'Date']):
                    day_bins.loc[i, keys[file_i+1]] += chunk.loc[content_i, 'Reactions'] + 1
                    days_i = i
                    break
            for i in range(weeks_i, len(week_bins)):
                if (i+1 == len(week_bins) and week_bins.loc[i, 'Date'] <= date):
                    week_bins.loc[i, keys[file_i+1]] += chunk.loc[content_i, 'Reactions'] + 1
                    break
                elif (week_bins.loc[i, 'Date'] <= date and date < week_bins.loc[i+1, 'Date']):
                    week_bins.loc[i, keys[file_i+1]] += chunk.loc[content_i, 'Reactions'] + 1
                    weeks_i = i
                    break
            content_i += 1
        print(f'chunk {chunk_i} added up after {datetime.now() - timestamp} hours')
        chunk_i += 1

    file_i += 1

day_bins.to_csv(target+'stacked daily activity.csv', index=False)
week_bins.to_csv(target+'stacked weekly activity.csv', index=False)

print(f'this started at {start} and took {datetime.now() - start} hours\n')
