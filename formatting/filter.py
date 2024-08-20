from os import listdir
from os.path import isfile, join

import pandas as pd

folder_raw = 'data/raw_2022-01-01-2023-12-31/'
folder_cut = 'data/discord/'

files = [f for f in listdir(folder_raw) if isfile(join(folder_raw, f))]

for file in files:
    content = pd.read_csv(folder_raw+file, usecols=['Author', 'Date', 'Reactions'])
    print(f'this is {file} start.')

    index = 0
    for row in content['Reactions']:
        if type(row) == type(""):
            reactions = []
            for reaction in row.split(','):
                emote = reaction.split()
                reactions.append(int(''.join(filter(str.isdigit, emote[len(emote)-1]))))
            content.loc[index, 'Reactions'] = sum(reactions)
            if (sum(reactions) > 2000):
                print(f'this is why we cant have nice things :\n{row}')
        else:
            content.loc[index, 'Reactions'] = 0
        index += 1

    content.to_csv(folder_cut+file, index=False)
    print(f'{file} is now complete.')
