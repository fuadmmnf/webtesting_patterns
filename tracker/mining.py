import os, json
import pandas as pd
from prefixspan import PrefixSpan

path_to_json = './../res/'
json_files = [json.load(open('./../res/' + pos_json)) for pos_json in os.listdir(path_to_json) if pos_json.endswith('.json')]

sequences = []
for json in json_files:
    for test in json:
        seq = []
        for i in range(len(test['commands'])):
            if test['commands'][i]['method'] == 'get':
                if 'tag' not in test["commands"][i]["element_entity"]:
                    continue
                seq.append(f'{test["commands"][i+1]["method"]} {test["commands"][i]["element_entity"]["tag"]}')
        sequences.append(seq)

ps = PrefixSpan(sequences)
patterns = ps.topk(500, closed=False)
for p in patterns:
    print(p)
