from os import listdir
from os.path import isfile, join

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone

folder = 'data/discord/'
target = 'data/discord/prepared/'

files = [f for f in listdir(folder) if isfile(join(folder, f))]
chunk_size = 100000

days = np.arange(datetime(2022, 1, 1), datetime(2024, 1, 1), timedelta(days=1)).astype(datetime)
for i in range(len(days)):
    days [i] = days[i].replace(tzinfo=timezone.utc)

day_bins = pd.DataFrame({
    'Date': days, 
    'Activity': np.zeros(len(days), dtype='uint32')
})

start = datetime.now()

for file in files:
    content = pd.read_csv(folder+file, usecols=['Date', 'Reactions'], chunksize=chunk_size)
    print(f'opened "{file}"')
    
    content_i = 0
    days_i = 0
    chunk_i = 0
    for chunk in content:
        timestamp = datetime.now()
        for msg in chunk['Date']:
            date = datetime.strptime(msg, '%Y-%m-%dT%H:%M:%S.%f0%z')
            for i in range(days_i, len(day_bins)-1):
                if (day_bins.loc[i, 'Date'] <= date and date < day_bins.loc[i+1, 'Date']):
                    day_bins.loc[i, 'Activity'] += chunk.loc[content_i, 'Reactions'] + 1
                    days_i = i
                    break
                elif (i+2 == len(day_bins) and day_bins.loc[i+1, 'Date'] <= date):
                    day_bins.loc[i+1, 'Activity'] += chunk.loc[content_i, 'Reactions'] + 1
                    break
            content_i += 1
        print(f'chunk {chunk_i} entered {content_i - (chunk_i * chunk_size)} lines into array after {datetime.now() - timestamp} hours')
        chunk_i += 1

day_bins.to_csv(target+'combined activitiy.csv', index=False)

print(f'this started at {start} and took {datetime.now() - start} hours')